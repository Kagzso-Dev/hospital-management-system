const db = require('../db/database');

function receiptNo(id) {
  return `RCPT-${String(id).padStart(4, '0')}`;
}

const createPayment = async (req, res) => {
  try {
    const { appointment_id, patient_id, amount, payment_mode, transaction_ref } = req.body;
    const tenantId = req.tenantId;

    if (!appointment_id || !patient_id || !amount || !payment_mode) {
      return res.status(400).json({ error: 'appointment_id, patient_id, amount, payment_mode are required' });
    }

    const validModes = ['cash', 'upi', 'card'];
    if (!validModes.includes(payment_mode)) {
      return res.status(400).json({ error: 'payment_mode must be cash, upi, or card' });
    }

    const [[apt]] = await db.query(
      `SELECT a.*, p.name as patient_name, p.patient_id as patient_code, d.name as doctor_name, d.specialization
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [appointment_id, tenantId]
    );
    if (!apt) return res.status(404).json({ error: 'Appointment not found' });

    const [[existing]] = await db.query(
      "SELECT id FROM payments WHERE appointment_id = ? AND payment_status = 'paid' AND tenant_id = ?",
      [appointment_id, tenantId]
    );
    if (existing) {
      const [[payment]] = await db.query('SELECT * FROM payments WHERE id = ?', [existing.id]);
      return res.json({
        ...payment,
        receipt_no: receiptNo(payment.id),
        patient_name: apt.patient_name,
        patient_code: apt.patient_code,
        doctor_name: apt.doctor_name,
        specialization: apt.specialization,
        token_display: apt.token_display,
        date: apt.date,
        time_slot: apt.time_slot,
      });
    }

    const [result] = await db.execute(
      "INSERT INTO payments (tenant_id, appointment_id, patient_id, amount, payment_mode, payment_status, transaction_ref) VALUES (?, ?, ?, ?, ?, 'paid', ?)",
      [tenantId, appointment_id, patient_id, amount, payment_mode, transaction_ref || null]
    );

    await db.execute(
      "UPDATE appointments SET payment_status = 'paid' WHERE id = ? AND tenant_id = ?",
      [appointment_id, tenantId]
    );

    const [[payment]] = await db.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);

    res.status(201).json({
      ...payment,
      receipt_no: receiptNo(payment.id),
      patient_name: apt.patient_name,
      patient_code: apt.patient_code,
      doctor_name: apt.doctor_name,
      specialization: apt.specialization,
      token_display: apt.token_display,
      date: apt.date,
      time_slot: apt.time_slot,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPayment = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const [[payment]] = await db.query(
      `SELECT py.*,
        p.name as patient_name, p.patient_id as patient_code,
        d.name as doctor_name, d.specialization,
        a.token_display, a.date, a.time_slot
       FROM payments py
       LEFT JOIN patients p ON py.patient_id = p.id
       LEFT JOIN appointments a ON py.appointment_id = a.id
       LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE py.appointment_id = ? AND py.payment_status = 'paid' AND py.tenant_id = ?
       ORDER BY py.id DESC LIMIT 1`,
      [appointment_id, req.tenantId]
    );

    if (!payment) return res.status(404).json({ error: 'No payment found' });
    res.json({ ...payment, receipt_no: receiptNo(payment.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listPayments = async (req, res) => {
  try {
    const { date, doctor_id } = req.query;
    let sql = `
      SELECT py.*,
        p.name as patient_name, p.patient_id as patient_code,
        d.name as doctor_name, d.specialization,
        a.token_display, a.date, a.time_slot
      FROM payments py
      LEFT JOIN patients p ON py.patient_id = p.id
      LEFT JOIN appointments a ON py.appointment_id = a.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE py.payment_status = 'paid' AND py.tenant_id = ?
    `;
    const params = [req.tenantId];
    if (date)      { sql += ' AND a.date = ?';      params.push(date); }
    if (doctor_id) { sql += ' AND a.doctor_id = ?'; params.push(doctor_id); }
    sql += ' ORDER BY py.created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows.map((r) => ({ ...r, receipt_no: receiptNo(r.id) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];

    const [[totals]] = await db.query(
      `SELECT
         COUNT(*) as total_count,
         COALESCE(SUM(py.amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN py.payment_mode = 'cash' THEN py.amount ELSE 0 END), 0) as cash_amount,
         COALESCE(SUM(CASE WHEN py.payment_mode = 'upi'  THEN py.amount ELSE 0 END), 0) as upi_amount,
         COALESCE(SUM(CASE WHEN py.payment_mode = 'card' THEN py.amount ELSE 0 END), 0) as card_amount
       FROM payments py
       LEFT JOIN appointments a ON py.appointment_id = a.id
       WHERE py.payment_status = 'paid' AND py.tenant_id = ? AND a.date = ?`,
      [req.tenantId, today]
    );
    res.json({ date: today, ...totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createPayment, getPayment, listPayments, getDailySummary };
