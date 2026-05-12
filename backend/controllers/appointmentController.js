const db = require('../db/database');

const getAppointments = async (req, res) => {
  try {
    const { date, doctor_id } = req.query;
    let sql = `
      SELECT a.*,
        p.name as patient_name, p.phone as patient_phone, p.patient_id as patient_pid,
        p.gender as patient_gender, p.age as patient_age,
        d.name as doctor_name, d.specialization
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.tenant_id = ?
    `;
    const params = [req.tenantId];
    if (date) { sql += ' AND a.date = ?'; params.push(date); }
    if (doctor_id) { sql += ' AND a.doctor_id = ?'; params.push(doctor_id); }
    sql += ' ORDER BY a.queue_position ASC';

    const [rows] = await db.query(sql, params);
    const appointments = rows.map((r) => ({
      ...r,
      patient: { id: r.patient_id, name: r.patient_name, phone: r.patient_phone, patient_id: r.patient_pid, gender: r.patient_gender, age: r.patient_age },
      doctor: { id: r.doctor_id, name: r.doctor_name, specialization: r.specialization },
    }));
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, date, time_slot } = req.body;
    const tenantId = req.tenantId;

    const [conflict] = await db.query(
      "SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status != 'cancelled' AND tenant_id = ?",
      [doctor_id, date, time_slot, tenantId]
    );
    if (conflict[0]) return res.status(400).json({ error: 'Slot already booked' });

    const [[{ count }]] = await db.query(
      "SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ? AND date = ? AND status != 'cancelled' AND tenant_id = ?",
      [doctor_id, date, tenantId]
    );
    const tokenNumber = count + 1;
    const tokenDisplay = `D${doctor_id}-${String(tokenNumber).padStart(3, '0')}`;

    const [result] = await db.execute(
      'INSERT INTO appointments (tenant_id, patient_id, doctor_id, date, time_slot, token_number, token_display, queue_position, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tenantId, patient_id, doctor_id, date, time_slot, tokenNumber, tokenDisplay, tokenNumber, 'waiting']
    );

    const [[apt]] = await db.query('SELECT * FROM appointments WHERE id = ?', [result.insertId]);
    const [[patient]] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, tenantId]);
    const [[doctor]] = await db.query('SELECT * FROM doctors WHERE id = ? AND tenant_id = ?', [doctor_id, tenantId]);

    req.io.emit(`token_update_${tenantId}`, { doctor_id });
    res.status(201).json({ ...apt, patient, doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = req.tenantId;

    const [[apt]] = await db.query('SELECT * FROM appointments WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (!apt) return res.status(404).json({ error: 'Not found' });

    await db.execute('UPDATE appointments SET status = ? WHERE id = ? AND tenant_id = ?', [status, id, tenantId]);

    const [[patient]] = await db.query('SELECT * FROM patients WHERE id = ?', [apt.patient_id]);
    const [[doctor]] = await db.query('SELECT * FROM doctors WHERE id = ?', [apt.doctor_id]);

    req.io.emit(`token_update_${tenantId}`, { doctor_id: apt.doctor_id });
    res.json({ ...apt, status, patient, doctor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAppointments, createAppointment, updateStatus };
