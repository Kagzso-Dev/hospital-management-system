/**
 * Integration tests – Hospital Multi-Tenant API
 *
 * Requires:
 *   - MySQL running with hospital_db (npm run seed creates base data)
 *   - Server NOT already running (supertest starts its own instance)
 *
 * Run:  npm test
 */

const request = require('supertest');
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const { Server } = require('socket.io');
const db      = require('../db/database');
const setupSocket = require('../socket/tokenSocket');

// ── Build the Express app (mirrors server.js without listen) ──────────────────
let app, server, io;

beforeAll(async () => {
  await db.init();

  // ── Clean up leftover test data from previous runs ─────────────────────────
  // Strategy:
  //   Pass 1 – delete by future appointment (catches orphaned payments where
  //             appointment is a test row but payment.patient_id is a seeded patient).
  //   Pass 2 – delete remaining test-patient rows (phones 0-5 = test pattern;
  //             real Indian phones start 6-9). City Clinic (tenant 2) is all test data.
  const today = new Date().toISOString().split('T')[0];

  // Pass 1: wipe everything attached to future appointments
  await db.query('DELETE FROM payments WHERE appointment_id IN (SELECT id FROM appointments WHERE date > ?)', [today]);
  await db.query(
    `DELETE pi FROM prescription_items pi
     JOIN prescriptions rx ON pi.prescription_id = rx.id
     WHERE rx.appointment_id IN (SELECT id FROM appointments WHERE date > ?)`, [today]);
  await db.query('DELETE FROM prescriptions WHERE appointment_id IN (SELECT id FROM appointments WHERE date > ?)', [today]);
  await db.query('DELETE FROM appointments WHERE date > ?', [today]);

  // Pass 2: wipe test patients and anything still attached to them
  const testPat = "SELECT id FROM (SELECT id FROM patients WHERE phone REGEXP '^[0-5]' OR tenant_id = 2) _tp";
  await db.query(`DELETE FROM payments          WHERE patient_id IN (${testPat})`);
  await db.query(`DELETE pi FROM prescription_items pi
                  JOIN prescriptions rx ON pi.prescription_id = rx.id
                  WHERE rx.patient_id IN (${testPat})`);
  await db.query(`DELETE FROM prescriptions     WHERE patient_id IN (${testPat})`);
  await db.query(`DELETE FROM appointments      WHERE patient_id IN (${testPat})`);
  await db.query(`DELETE FROM patients WHERE phone REGEXP '^[0-5]' OR tenant_id = 2`);
  // ──────────────────────────────────────────────────────────────────────────

  app = express();
  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });

  app.use(cors());
  app.use(express.json());
  app.use((req, _, next) => { req.io = io; next(); });

  app.use('/api/auth',          require('../routes/auth'));
  app.use('/api/superadmin',    require('../routes/superadmin'));
  app.use('/api/patients',      require('../routes/patients'));
  app.use('/api/doctors',       require('../routes/doctors'));
  app.use('/api/appointments',  require('../routes/appointments'));
  app.use('/api/prescriptions', require('../routes/prescriptions'));
  app.use('/api/tokens',        require('../routes/tokens'));
  app.use('/api/medicines',     require('../routes/medicines'));
  app.use('/api/admin',         require('../routes/admin'));
  app.use('/api/payments',      require('../routes/payments'));

  setupSocket(io);
}, 15000);

afterAll(async () => {
  server?.close();
  io?.close();
  if (_pool) await _pool.end().catch(() => {});
});

// Expose pool for teardown
let _pool;
const _origInit = db.init.bind(db);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function loginTenant(username, password) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  return res.body.token ?? null;
}

async function loginSuperadmin() {
  const res = await request(app)
    .post('/api/superadmin/login')
    .send({ username: 'superadmin', password: 'superadmin123' });
  return res.body.token ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════
describe('1. Authentication', () => {
  test('1.1 Tenant login – valid credentials returns JWT + tenant info', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'apollo', password: 'apollo123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.tenant.username).toBe('apollo');
  });

  test('1.2 Tenant login – wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'apollo', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  test('1.3 Tenant login – unknown user returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'xxx' });

    expect(res.status).toBe(401);
  });

  test('1.4 Protected endpoint without token returns 401', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('1.5 Protected endpoint with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  test('1.6 Superadmin login – valid credentials returns JWT', async () => {
    const res = await request(app)
      .post('/api/superadmin/login')
      .send({ username: 'superadmin', password: 'superadmin123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('1.7 Tenant token is rejected by superadmin route (403)', async () => {
    const token = await loginTenant('apollo', 'apollo123');
    const res   = await request(app)
      .get('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('1.8 Superadmin token is rejected by tenant routes (403)', async () => {
    const token = await loginSuperadmin();
    const res   = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('1.9 Missing body fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'apollo' }); // no password
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MULTI-TENANT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════════
describe('2. Multi-Tenant Isolation', () => {
  let apolloToken, cityToken;
  let apolloPatientId, cityPatientId;
  const cityPhone = `55${Date.now().toString().slice(-8)}`;

  beforeAll(async () => {
    apolloToken = await loginTenant('apollo', 'apollo123');
    cityToken   = await loginTenant('cityclinic', 'city123');

    // Apollo already has seeded patients — grab first
    const apRes = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${apolloToken}`);
    apolloPatientId = apRes.body[0]?.id;

    // City Clinic has no seeded data — create a patient so isolation tests work
    const cpRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${cityToken}`)
      .send({ name: 'City Test Patient', age: 30, gender: 'Male', phone: cityPhone });
    cityPatientId = cpRes.body.id;
  });

  test('2.1 Apollo has seeded patients; City Clinic has the one we just created', async () => {
    const [ap, cp] = await Promise.all([
      request(app).get('/api/patients').set('Authorization', `Bearer ${apolloToken}`),
      request(app).get('/api/patients').set('Authorization', `Bearer ${cityToken}`),
    ]);
    expect(ap.status).toBe(200);
    expect(cp.status).toBe(200);
    expect(ap.body.length).toBeGreaterThan(0);
    expect(cp.body.length).toBeGreaterThan(0);
  });

  test('2.2 Apollo patient IDs do not appear in City Clinic results', async () => {
    const [ap, cp] = await Promise.all([
      request(app).get('/api/patients').set('Authorization', `Bearer ${apolloToken}`),
      request(app).get('/api/patients').set('Authorization', `Bearer ${cityToken}`),
    ]);
    const apolloIds = new Set(ap.body.map(p => p.id));
    const cityIds   = new Set(cp.body.map(p => p.id));
    const overlap   = [...apolloIds].filter(id => cityIds.has(id));
    expect(overlap).toHaveLength(0);
  });

  test('2.3 Tenant A (Apollo) cannot fetch Tenant B (City) patient by ID', async () => {
    expect(cityPatientId).toBeDefined(); // guard: city patient must exist
    const res = await request(app)
      .get(`/api/patients/${cityPatientId}`)
      .set('Authorization', `Bearer ${apolloToken}`); // Apollo token
    expect(res.status).toBe(404);
  });

  test('2.4 Tenant B (City) cannot fetch Tenant A (Apollo) patient by ID', async () => {
    expect(apolloPatientId).toBeDefined();
    const res = await request(app)
      .get(`/api/patients/${apolloPatientId}`)
      .set('Authorization', `Bearer ${cityToken}`); // City token
    expect(res.status).toBe(404);
  });

  test('2.5 Apollo doctors are not visible to City Clinic and vice versa', async () => {
    const [ar, cr] = await Promise.all([
      request(app).get('/api/doctors').set('Authorization', `Bearer ${apolloToken}`),
      request(app).get('/api/doctors').set('Authorization', `Bearer ${cityToken}`),
    ]);
    // Apollo has seeded doctors, City has none yet — no overlap either way
    const apolloIds = ar.body.map(d => d.id);
    const cityIds   = cr.body.map(d => d.id);
    const overlap   = apolloIds.filter(id => cityIds.includes(id));
    expect(overlap).toHaveLength(0);
  });

  test('2.6 Suspended tenant cannot login, re-activated can', async () => {
    const saToken = await loginSuperadmin();

    const tenantsRes = await request(app)
      .get('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${saToken}`);
    const apollo = tenantsRes.body.find(t => t.username === 'apollo');
    expect(apollo).toBeDefined();

    // Suspend
    await request(app)
      .put(`/api/superadmin/tenants/${apollo.id}/status`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'suspended' });

    const suspendedLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'apollo', password: 'apollo123' });
    expect(suspendedLogin.status).toBe(403);

    // Re-activate so subsequent tests still work
    await request(app)
      .put(`/api/superadmin/tenants/${apollo.id}/status`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'active' });

    const reactivatedLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'apollo', password: 'apollo123' });
    expect(reactivatedLogin.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PATIENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
describe('3. Patient Management', () => {
  let token;
  let createdPatientId;
  const testPhone = `44${Date.now().toString().slice(-8)}`;

  beforeAll(async () => {
    token = await loginTenant('apollo', 'apollo123');
  });

  test('3.1 Search patients returns array', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('3.2 Create new patient succeeds and assigns PAT-prefixed ID', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Patient Reg', age: 30, gender: 'Male', phone: testPhone, address: '123 Test St' });

    expect(res.status).toBe(201);
    expect(res.body.patient_id).toMatch(/^PAT/);
    expect(res.body.name).toBe('Test Patient Reg');
    createdPatientId = res.body.id;
  });

  test('3.3 Duplicate phone registration is rejected', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Duplicate', age: 25, gender: 'Female', phone: testPhone });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('3.4 Get patient by ID returns record with appointment history', async () => {
    const res = await request(app)
      .get(`/api/patients/${createdPatientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdPatientId);
    expect(Array.isArray(res.body.appointments)).toBe(true);
  });

  test('3.5 Search by phone returns matching patient', async () => {
    const res = await request(app)
      .get(`/api/patients?phone=${testPhone}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].phone).toBe(testPhone);
  });

  test('3.6 Search by name partial match works', async () => {
    const res = await request(app)
      .get('/api/patients?name=Test+Patient+Reg')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.some(p => p.name === 'Test Patient Reg')).toBe(true);
  });

  test('3.7 Get non-existent patient returns 404', async () => {
    const res = await request(app)
      .get('/api/patients/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DOCTOR MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
describe('4. Doctor Management', () => {
  let token;
  let createdDoctorId;

  beforeAll(async () => {
    token = await loginTenant('apollo', 'apollo123');
  });

  test('4.1 List doctors returns non-empty array for seeded tenant', async () => {
    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('4.2 Create new doctor succeeds', async () => {
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dr. Test Dermatologist', specialization: 'Dermatology', phone: '8000099999', password: 'doc123', consultation_fee: 500 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Dr. Test Dermatologist');
    createdDoctorId = res.body.id;
  });

  test('4.3 Doctor verify – correct password returns ok:true', async () => {
    const res = await request(app)
      .post(`/api/doctors/${createdDoctorId}/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'doc123' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('4.4 Doctor verify – wrong password returns ok:false', async () => {
    const res = await request(app)
      .post(`/api/doctors/${createdDoctorId}/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'wrongpass' });

    // Controller returns 200 with ok:false (not 401)
    expect(res.body.ok).toBe(false);
  });

  test('4.5 Get available slots for a doctor returns slots object', async () => {
    const d = new Date();
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1); // advance to next Monday
    const dateStr = d.toISOString().split('T')[0];

    const res = await request(app)
      .get(`/api/doctors/${createdDoctorId}/slots?date=${dateStr}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Response: { slots: [...], unavailable: bool }
    expect(res.body).toHaveProperty('slots');
    expect(Array.isArray(res.body.slots)).toBe(true);
  });

  test('4.6 Delete test doctor succeeds', async () => {
    const res = await request(app)
      .delete(`/api/doctors/${createdDoctorId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. APPOINTMENT WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe('5. Appointment Workflow', () => {
  let apolloToken, cityToken;
  let patientId, doctorId, appointmentId;
  const apptDate = new Date();
  apptDate.setDate(apptDate.getDate() + 7); // 1 week ahead to avoid conflicts
  const dateStr  = apptDate.toISOString().split('T')[0];
  const timeSlot = String(Date.now()).slice(-10); // unique per run, fits varchar(10)
  const testPhone3 = `33${Date.now().toString().slice(-8)}`;

  beforeAll(async () => {
    apolloToken = await loginTenant('apollo', 'apollo123');
    cityToken   = await loginTenant('cityclinic', 'city123');

    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ name: 'Appt Workflow Patient', age: 28, gender: 'Female', phone: testPhone3 });
    patientId = pRes.body.id;

    const dRes = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${apolloToken}`);
    doctorId = dRes.body[0].id;
  });

  test('5.1 Create appointment returns token_display in D{id}-{NNN} format', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ patient_id: patientId, doctor_id: doctorId, date: dateStr, time_slot: timeSlot });

    expect(res.status).toBe(201);
    expect(res.body.token_display).toMatch(/^D\d+-\d{3}$/);
    expect(res.body.status).toBe('waiting');
    appointmentId = res.body.id;
  });

  test('5.2 Booking same slot twice is rejected', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ patient_id: patientId, doctor_id: doctorId, date: dateStr, time_slot: timeSlot });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already booked/i);
  });

  test('5.3 List appointments filtered by date', async () => {
    const res = await request(app)
      .get(`/api/appointments?date=${dateStr}`)
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(a => a.id === appointmentId)).toBe(true);
  });

  test('5.4 List appointments filtered by doctor', async () => {
    const res = await request(app)
      .get(`/api/appointments?date=${dateStr}&doctor_id=${doctorId}`)
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every(a => a.doctor_id === doctorId)).toBe(true);
  });

  test('5.5 Status flow: waiting → in_progress → completed', async () => {
    const r1 = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ status: 'in_progress' });
    expect(r1.status).toBe(200);
    expect(r1.body.status).toBe('in_progress');

    const r2 = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ status: 'completed' });
    expect(r2.status).toBe(200);
    expect(r2.body.status).toBe('completed');
  });

  test('5.6 Update non-existent appointment returns 404', async () => {
    const res = await request(app)
      .put('/api/appointments/999999/status')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  test('5.7 Cross-tenant: City Clinic cannot update Apollo appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${cityToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(404); // not found in city clinic's scope
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PRESCRIPTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe('6. Prescription Flow', () => {
  let apolloToken, cityToken;
  let patientId, doctorId, appointmentId, prescriptionId;
  const rxPhone = `22${Date.now().toString().slice(-8)}`;
  const rxDate  = new Date();
  rxDate.setDate(rxDate.getDate() + 10);
  const dateStr = rxDate.toISOString().split('T')[0];

  beforeAll(async () => {
    apolloToken = await loginTenant('apollo', 'apollo123');
    cityToken   = await loginTenant('cityclinic', 'city123');

    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ name: 'Rx Workflow Patient', age: 45, gender: 'Male', phone: rxPhone });
    patientId = pRes.body.id;

    const dRes = await request(app).get('/api/doctors').set('Authorization', `Bearer ${apolloToken}`);
    doctorId = dRes.body[0].id;

    const aRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({ patient_id: patientId, doctor_id: doctorId, date: dateStr, time_slot: String(Date.now() + 1).slice(-10) });
    appointmentId = aRes.body.id;
  });

  test('6.1 Create prescription with multiple medicine items', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${apolloToken}`)
      .send({
        appointment_id: appointmentId,
        doctor_id: doctorId,
        patient_id: patientId,
        diagnosis: 'Viral fever',
        notes: 'Rest for 3 days, plenty of fluids',
        items: [
          { medicine_name: 'Paracetamol 500mg', dosage: '1 tablet', morning: 1, afternoon: 1, night: 1, duration: 5, instructions: 'After food' },
          { medicine_name: 'Cetirizine 10mg',   dosage: '1 tablet', morning: 0, afternoon: 0, night: 1, duration: 5, instructions: 'Before sleep' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.diagnosis).toBe('Viral fever');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items).toHaveLength(2);
    prescriptionId = res.body.id;
  });

  test('6.2 Fetch prescription by appointment ID', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/appointment/${appointmentId}`)
      .set('Authorization', `Bearer ${apolloToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(prescriptionId);
    expect(res.body.items).toHaveLength(2);
  });

  test('6.3 Fetch all prescriptions for patient', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/patient/${patientId}`)
      .set('Authorization', `Bearer ${apolloToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('6.4 Cross-tenant: City Clinic prescription query returns null (not Apollo data)', async () => {
    const res = await request(app)
      .get(`/api/prescriptions/appointment/${appointmentId}`)
      .set('Authorization', `Bearer ${cityToken}`);
    // City clinic tenant should get null — not Apollo's prescription
    expect(res.body).toBeFalsy(); // null or undefined
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PAYMENT FLOW
// ═══════════════════════════════════════════════════════════════════════════════
describe('7. Payment Flow', () => {
  let token;
  let patientId, doctorId, appointmentId;
  const pmtPhone = `11${Date.now().toString().slice(-8)}`;
  const pmtDate  = new Date();
  pmtDate.setDate(pmtDate.getDate() + 14);
  const dateStr = pmtDate.toISOString().split('T')[0];
  const today   = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    token = await loginTenant('apollo', 'apollo123');

    const pRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pmt Workflow Patient', age: 35, gender: 'Female', phone: pmtPhone });
    patientId = pRes.body.id;

    const dRes = await request(app).get('/api/doctors').set('Authorization', `Bearer ${token}`);
    doctorId = dRes.body[0].id;

    const aRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ patient_id: patientId, doctor_id: doctorId, date: dateStr, time_slot: String(Date.now() + 2).slice(-10) });
    appointmentId = aRes.body.id;
  });

  test('7.1 Create payment (cash) returns paid status', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: appointmentId, patient_id: patientId, amount: 300, payment_mode: 'cash' });

    expect(res.status).toBe(201);
    expect(res.body.payment_status).toBe('paid');
    expect(res.body.payment_mode).toBe('cash');
  });

  test('7.2 Get payment by appointment ID', async () => {
    const res = await request(app)
      .get(`/api/payments/${appointmentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.amount).toBeDefined();
  });

  test('7.3 List all payments returns array', async () => {
    const res = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('7.4 Invalid payment mode is rejected', async () => {
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_id: appointmentId, patient_id: patientId, amount: 300, payment_mode: 'bitcoin' });
    expect(res.status).toBe(400);
  });

  test('7.5 Daily payment summary includes total_amount field', async () => {
    const res = await request(app)
      .get(`/api/payments/summary?date=${today}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_amount');
    expect(res.body).toHaveProperty('cash_amount');
    expect(res.body).toHaveProperty('upi_amount');
    expect(res.body).toHaveProperty('card_amount');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. TOKEN DISPLAY (Public endpoint)
// ═══════════════════════════════════════════════════════════════════════════════
describe('8. Token Display', () => {
  let token;
  let doctorId;

  beforeAll(async () => {
    token = await loginTenant('apollo', 'apollo123');
    const dRes = await request(app).get('/api/doctors').set('Authorization', `Bearer ${token}`);
    doctorId = dRes.body[0].id;
  });

  test('8.1 Token display /display is public – no auth required', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res   = await request(app)
      .get(`/api/tokens/display?doctor_id=${doctorId}&date=${today}`);
    expect(res.status).not.toBe(401);
    expect(res.status).toBe(200);
  });

  test('8.2 Token display /all requires tenant auth', async () => {
    const res = await request(app).get('/api/tokens/display/all');
    expect(res.status).toBe(401);
  });

  test('8.3 Token display /all with valid token returns array', async () => {
    const res = await request(app)
      .get('/api/tokens/display/all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
describe('9. Admin Panel', () => {
  let apolloToken, cityToken;

  beforeAll(async () => {
    apolloToken = await loginTenant('apollo', 'apollo123');
    cityToken   = await loginTenant('cityclinic', 'city123');
  });

  test('9.1 Admin analytics returns summary structure', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
    // Response shape: { summary, byDoctor, dailyTrend, patientStats, peakHours, dayOfWeek }
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('byDoctor');
  });

  test('9.2 Admin doctors list includes doctor records', async () => {
    const res = await request(app)
      .get('/api/admin/doctors')
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('9.3 Admin appointments by date returns array', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res   = await request(app)
      .get(`/api/admin/appointments?date=${today}`)
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('9.4 Admin availability endpoint returns data for a doctor/date', async () => {
    const dRes  = await request(app).get('/api/doctors').set('Authorization', `Bearer ${apolloToken}`);
    const docId = dRes.body[0].id;
    const today = new Date().toISOString().split('T')[0];
    const res   = await request(app)
      .get(`/api/admin/availability?doctor_id=${docId}&date=${today}`)
      .set('Authorization', `Bearer ${apolloToken}`);
    expect(res.status).toBe(200);
  });

  test('9.5 Admin panel is not accessible without auth', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(401);
  });

  test('9.6 Admin analytics is tenant-isolated (Apollo ≠ City Clinic totals)', async () => {
    // Use all-time range so seeded Apollo data is included
    const [ar, cr] = await Promise.all([
      request(app).get('/api/admin/analytics?from=2000-01-01&to=2099-12-31').set('Authorization', `Bearer ${apolloToken}`),
      request(app).get('/api/admin/analytics?from=2000-01-01&to=2099-12-31').set('Authorization', `Bearer ${cityToken}`),
    ]);
    expect(ar.status).toBe(200);
    expect(cr.status).toBe(200);
    // Apollo has many seeded appointments; City Clinic started empty — counts differ
    const apolloTotal = ar.body?.summary?.total ?? 0;
    const cityTotal   = cr.body?.summary?.total ?? 0;
    // Apollo must have more than city clinic (seeded data vs. empty start)
    expect(apolloTotal).toBeGreaterThan(cityTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. MEDICINES
// ═══════════════════════════════════════════════════════════════════════════════
describe('10. Medicines', () => {
  let token;

  beforeAll(async () => {
    token = await loginTenant('apollo', 'apollo123');
  });

  test('10.1 Search by name returns matching medicines', async () => {
    const res = await request(app)
      .get('/api/medicines?q=paracetamol')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('10.2 Empty query returns full medicines list', async () => {
    const res = await request(app)
      .get('/api/medicines')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('10.3 Medicine endpoint requires auth', async () => {
    const res = await request(app).get('/api/medicines?q=para');
    expect(res.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. SUPERADMIN – TENANT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
describe('11. Superadmin – Tenant Management', () => {
  let saToken;
  let newTenantId;
  const uniqueUsername = `testhospital_${Date.now()}`;

  beforeAll(async () => {
    saToken = await loginSuperadmin();
    expect(saToken).toBeTruthy(); // guard: superadmin login must succeed
  });

  test('11.1 List tenants returns all hospitals with counts', async () => {
    const res = await request(app)
      .get('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${saToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toHaveProperty('doctor_count');
    expect(res.body[0]).toHaveProperty('patient_count');
  });

  test('11.2 Create new tenant succeeds', async () => {
    const res = await request(app)
      .post('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'Test Hospital', username: uniqueUsername, password: 'test123' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    newTenantId = res.body.id;
  });

  test('11.3 Duplicate username is rejected (409)', async () => {
    const res = await request(app)
      .post('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'Apollo Dup', username: 'apollo', password: 'pass' });
    expect(res.status).toBe(409);
  });

  test('11.4 Reset tenant password enables login with new password', async () => {
    await request(app)
      .put(`/api/superadmin/tenants/${newTenantId}/password`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ password: 'newpass123' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: uniqueUsername, password: 'newpass123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });

  test('11.5 Invalid status value is rejected (400)', async () => {
    const res = await request(app)
      .put(`/api/superadmin/tenants/${newTenantId}/status`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'banned' });
    expect(res.status).toBe(400);
  });

  test('11.6 Short password (< 4 chars) is rejected (400)', async () => {
    const res = await request(app)
      .put(`/api/superadmin/tenants/${newTenantId}/password`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ password: 'ab' });
    expect(res.status).toBe(400);
  });

  test('11.7 Missing required fields returns 400', async () => {
    const res = await request(app)
      .post('/api/superadmin/tenants')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'No Creds' }); // missing username and password
    expect(res.status).toBe(400);
  });

  test('11.8 Update tenant name succeeds', async () => {
    const res = await request(app)
      .put(`/api/superadmin/tenants/${newTenantId}/name`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'Updated Hospital Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Hospital Name');
  });

  test('11.9 Update tenant name with too short name fails (400)', async () => {
    const res = await request(app)
      .put(`/api/superadmin/tenants/${newTenantId}/name`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'a' });
    expect(res.status).toBe(400);
  });
});
