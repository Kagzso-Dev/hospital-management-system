const db = require('../db/database');

const searchPatients = async (req, res) => {
  try {
    const { phone, name, patient_id } = req.query;
    let sql = 'SELECT * FROM patients WHERE tenant_id = ?';
    const params = [req.tenantId];
    if (phone) { sql += ' AND phone LIKE ?'; params.push(`%${phone}%`); }
    if (name) { sql += ' AND name LIKE ?'; params.push(`%${name}%`); }
    if (patient_id) { sql += ' AND patient_id LIKE ?'; params.push(`%${patient_id}%`); }
    sql += ' ORDER BY created_at DESC LIMIT 20';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createPatient = async (req, res) => {
  try {
    const { name, age, dob, gender, phone, address } = req.body;
    const tenantId = req.tenantId;

    const [existing] = await db.query('SELECT * FROM patients WHERE phone = ? AND tenant_id = ?', [phone, tenantId]);
    if (existing[0]) return res.status(400).json({ error: 'Phone already registered', patient: existing[0] });

    let patient;
    await db.transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO patients (tenant_id, name, age, dob, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tenantId, name, age || null, dob || null, gender || null, phone, address || null]
      );
      const id = result.insertId;
      // Use auto-increment ID to prevent race conditions and duplicate patient IDs
      const patient_id = `PAT${String(id + 100000).padStart(6, '0')}`;
      await conn.execute('UPDATE patients SET patient_id = ? WHERE id = ?', [patient_id, id]);
      const [[p]] = await conn.query('SELECT * FROM patients WHERE id = ?', [id]);
      patient = p;
    });

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatient = async (req, res) => {
  try {
    const [[patient]] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [appointments] = await db.query(
      `SELECT a.*, d.name as doctor_name, d.specialization
       FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE a.patient_id = ? AND a.tenant_id = ? ORDER BY a.date DESC, a.created_at DESC`,
      [patient.id, req.tenantId]
    );

    for (const apt of appointments) {
      const [[rx]] = await db.query('SELECT * FROM prescriptions WHERE appointment_id = ? AND tenant_id = ?', [apt.id, req.tenantId]);
      if (rx) {
        const [items] = await db.query('SELECT * FROM prescription_items WHERE prescription_id = ?', [rx.id]);
        apt.prescription = { ...rx, items };
      }
    }

    res.json({ ...patient, appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { searchPatients, createPatient, getPatient };
