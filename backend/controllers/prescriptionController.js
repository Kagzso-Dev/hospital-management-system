const db = require('../db/database');

const createPrescription = async (req, res) => {
  try {
    const { appointment_id, doctor_id, patient_id, diagnosis, notes, items } = req.body;
    const tenantId = req.tenantId;
    let rxId;

    await db.transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO prescriptions (tenant_id, appointment_id, doctor_id, patient_id, diagnosis, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [tenantId, appointment_id || null, doctor_id, patient_id, diagnosis || null, notes || null]
      );
      rxId = result.insertId;

      if (items && items.length > 0) {
        for (const item of items) {
          await conn.execute(
            'INSERT INTO prescription_items (prescription_id, medicine_name, dosage, morning, afternoon, night, duration, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [rxId, item.medicine_name, item.dosage || null,
              item.morning ? 1 : 0, item.afternoon ? 1 : 0, item.night ? 1 : 0,
              item.duration || null, item.instructions || null]
          );
        }
      }
    });

    const [[rx]] = await db.query('SELECT * FROM prescriptions WHERE id = ?', [rxId]);
    const [rxItems] = await db.query('SELECT * FROM prescription_items WHERE prescription_id = ?', [rxId]);
    const [[doctor]] = await db.query('SELECT * FROM doctors WHERE id = ? AND tenant_id = ?', [doctor_id, tenantId]);
    const [[patient]] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, tenantId]);

    res.status(201).json({ ...rx, items: rxItems, doctor, patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPatientPrescriptions = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const [prescriptions] = await db.query(
      `SELECT p.*, d.name as doctor_name, d.specialization, a.date as appt_date, a.time_slot
       FROM prescriptions p
       LEFT JOIN doctors d ON p.doctor_id = d.id
       LEFT JOIN appointments a ON p.appointment_id = a.id
       WHERE p.patient_id = ? AND p.tenant_id = ?
       ORDER BY p.created_at DESC`,
      [patient_id, req.tenantId]
    );

    for (const rx of prescriptions) {
      const [items] = await db.query('SELECT * FROM prescription_items WHERE prescription_id = ?', [rx.id]);
      rx.items = items;
      rx.doctor = { name: rx.doctor_name, specialization: rx.specialization };
      rx.appointment = { date: rx.appt_date, time_slot: rx.time_slot };
    }
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAppointmentPrescription = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const [[rx]] = await db.query('SELECT * FROM prescriptions WHERE appointment_id = ? AND tenant_id = ?', [appointment_id, req.tenantId]);
    if (!rx) return res.json(null);
    const [items] = await db.query('SELECT * FROM prescription_items WHERE prescription_id = ?', [rx.id]);
    const [[doctor]] = await db.query('SELECT * FROM doctors WHERE id = ?', [rx.doctor_id]);
    const [[patient]] = await db.query('SELECT * FROM patients WHERE id = ?', [rx.patient_id]);
    res.json({ ...rx, items, doctor, patient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createPrescription, getPatientPrescriptions, getAppointmentPrescription };
