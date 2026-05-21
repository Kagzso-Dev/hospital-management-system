const db = require('../db/database');

function chargeNo(id) {
  return `PC-${String(id).padStart(4, '0')}`;
}

const createReceptionCharge = async (req, res) => {
  try {
    const { patient_name, patient_code, label, amount, payment_mode, transaction_ref } = req.body;
    const tenantId = req.tenantId;

    if (!patient_name || !label || !amount || !payment_mode) {
      return res.status(400).json({ error: 'patient_name, label, amount, payment_mode are required' });
    }
    const validModes = ['cash', 'upi', 'card'];
    if (!validModes.includes(payment_mode)) {
      return res.status(400).json({ error: 'payment_mode must be cash, upi, or card' });
    }

    const [result] = await db.execute(
      'INSERT INTO reception_charges (tenant_id, patient_name, patient_code, label, amount, payment_mode, transaction_ref) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, patient_name.trim(), patient_code || null, label.trim(), Number(amount), payment_mode, transaction_ref || null]
    );

    const no = chargeNo(result.insertId);
    await db.execute('UPDATE reception_charges SET charge_no = ? WHERE id = ?', [no, result.insertId]);

    const [[charge]] = await db.query('SELECT * FROM reception_charges WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...charge, charge_no: no });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listReceptionCharges = async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    const [rows] = await db.query(
      'SELECT * FROM reception_charges WHERE tenant_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC',
      [req.tenantId, today]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReceptionChargeSummary = async (req, res) => {
  try {
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    const [[totals]] = await db.query(
      `SELECT
         COUNT(*) as total_count,
         COALESCE(SUM(amount), 0) as total_amount,
         COALESCE(SUM(CASE WHEN payment_mode='cash' THEN amount ELSE 0 END), 0) as cash_amount,
         COALESCE(SUM(CASE WHEN payment_mode='upi'  THEN amount ELSE 0 END), 0) as upi_amount,
         COALESCE(SUM(CASE WHEN payment_mode='card' THEN amount ELSE 0 END), 0) as card_amount
       FROM reception_charges
       WHERE tenant_id = ? AND DATE(created_at) = ?`,
      [req.tenantId, today]
    );
    res.json({ date: today, ...totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createReceptionCharge, listReceptionCharges, getReceptionChargeSummary };
