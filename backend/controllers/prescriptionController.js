const db = require('../db/database');

const createPrescription = async (req, res) => {
  try {
    const { appointment_id, doctor_id, patient_id, diagnosis, notes, items, procedure_charge, procedure_label } = req.body;
    const tenantId = req.tenantId;
    let rxId;

    await db.transaction(async (conn) => {
      const [result] = await conn.execute(
        'INSERT INTO prescriptions (tenant_id, appointment_id, doctor_id, patient_id, diagnosis, notes, procedure_charge, procedure_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, appointment_id || null, doctor_id, patient_id, diagnosis || null, notes || null,
          Number(procedure_charge) > 0 ? Number(procedure_charge) : 0,
          procedure_label || null]
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

const getProcedureCharges = async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      `SELECT rx.id, rx.procedure_charge, rx.procedure_label, rx.created_at,
              p.name as patient_name, p.patient_id as patient_code,
              d.name as doctor_name,
              a.date as appt_date, a.time_slot, a.token_display
       FROM prescriptions rx
       LEFT JOIN patients p ON rx.patient_id = p.id
       LEFT JOIN doctors d ON rx.doctor_id = d.id
       LEFT JOIN appointments a ON rx.appointment_id = a.id
       WHERE rx.tenant_id = ? AND rx.procedure_charge > 0 AND DATE(rx.created_at) = ?
       ORDER BY rx.created_at DESC`,
      [req.tenantId, today]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPendingProcedureCharges = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      `SELECT rx.id, rx.procedure_charge, rx.procedure_label, rx.created_at,
              p.name as patient_name, p.patient_id as patient_code, p.age, p.gender,
              d.name as doctor_name, d.specialization,
              a.id as appointment_id, a.date as appt_date, a.time_slot, a.token_display,
              py.amount as consult_amount, py.payment_mode as consult_mode
       FROM prescriptions rx
       JOIN appointments a ON rx.appointment_id = a.id
       JOIN patients p ON rx.patient_id = p.id
       JOIN doctors d ON rx.doctor_id = d.id
       LEFT JOIN payments py ON py.appointment_id = a.id AND py.payment_status = 'paid'
       WHERE rx.tenant_id = ? AND rx.procedure_charge > 0 AND rx.procedure_paid = 0
         AND a.date = ?
       ORDER BY rx.created_at DESC`,
      [req.tenantId, today]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function procReceiptNo(id) {
  return `PR-${String(id).padStart(4, '0')}`;
}

const payProcedureCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_mode, transaction_ref } = req.body;
    const tenantId = req.tenantId;

    if (!payment_mode) return res.status(400).json({ error: 'payment_mode required' });
    const validModes = ['cash', 'upi', 'card'];
    if (!validModes.includes(payment_mode)) return res.status(400).json({ error: 'Invalid payment_mode' });

    const [[rx]] = await db.query(
      'SELECT * FROM prescriptions WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!rx) return res.status(404).json({ error: 'Prescription not found' });
    if (rx.procedure_paid) return res.status(400).json({ error: 'Procedure charge already paid' });
    if (!rx.procedure_charge || Number(rx.procedure_charge) <= 0) {
      return res.status(400).json({ error: 'No procedure charge on this prescription' });
    }

    const receiptNo = procReceiptNo(rx.id);
    const paidAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      `UPDATE prescriptions
       SET procedure_paid = 1, procedure_payment_mode = ?, procedure_paid_at = ?, procedure_receipt_no = ?
       WHERE id = ? AND tenant_id = ?`,
      [payment_mode, paidAt, receiptNo, id, tenantId]
    );

    const [[updated]] = await db.query(
      `SELECT rx.*, p.name as patient_name, p.patient_id as patient_code, p.age, p.gender,
              d.name as doctor_name, d.specialization,
              a.token_display, a.date as appt_date, a.time_slot,
              py.amount as consult_amount
       FROM prescriptions rx
       JOIN patients p ON rx.patient_id = p.id
       JOIN doctors d ON rx.doctor_id = d.id
       LEFT JOIN appointments a ON rx.appointment_id = a.id
       LEFT JOIN payments py ON py.appointment_id = a.id AND py.payment_status = 'paid'
       WHERE rx.id = ?`,
      [id]
    );

    res.json({ ...updated, procedure_receipt_no: receiptNo, transaction_ref: transaction_ref || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createPrescription, getPatientPrescriptions, getAppointmentPrescription, getProcedureCharges, getPendingProcedureCharges, payProcedureCharge };
