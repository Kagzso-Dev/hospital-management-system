const db = require('../db/database');

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Token display is public — doctor_id is globally unique so it implicitly scopes to the right tenant
const getTokenDisplay = async (req, res) => {
  try {
    const { doctor_id } = req.query;
    const today = localDateStr();

    const [[doctor]] = await db.query(
      `SELECT d.id, d.name, d.specialization, d.tenant_id, t.hospital_name, t.hospital_tagline
       FROM doctors d LEFT JOIN tenants t ON t.id = d.tenant_id
       WHERE d.id = ? LIMIT 1`,
      [doctor_id]
    );

    const [[current]] = await db.query(
      `SELECT a.*, p.name as patient_name FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'in_progress'
       LIMIT 1`,
      [doctor_id, today]
    );

    const [next] = await db.query(
      `SELECT a.*, p.name as patient_name FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'waiting'
       ORDER BY a.queue_position ASC LIMIT 3`,
      [doctor_id, today]
    );

    const [[counts]] = await db.query(
      `SELECT
        SUM(status = 'waiting')     AS waiting,
        SUM(status = 'completed')   AS completed,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'cancelled')   AS cancelled,
        COUNT(*)                    AS total
       FROM appointments WHERE doctor_id = ? AND date = ?`,
      [doctor_id, today]
    );

    const fmt = (row) => row ? { ...row, patient: { name: row.patient_name } } : null;
    res.json({
      doctor: doctor || null,
      current: fmt(current),
      next: next.map(fmt),
      counts: {
        waiting:     Number(counts.waiting     || 0),
        completed:   Number(counts.completed   || 0),
        in_progress: Number(counts.in_progress || 0),
        cancelled:   Number(counts.cancelled   || 0),
        total:       Number(counts.total       || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllTokensDisplay = async (req, res) => {
  try {
    const today = localDateStr();
    // tenant_id from auth middleware (tenantAuth applied on this route)
    const tenantId = req.tenantId;

    const [doctors] = await db.query(
      'SELECT id, name, specialization FROM doctors WHERE is_active = 1 AND tenant_id = ? ORDER BY id',
      [tenantId]
    );

    const result = await Promise.all(doctors.map(async (doc) => {
      const [[current]] = await db.query(
        `SELECT a.id, a.token_display, a.token_number, a.queue_position, p.name AS patient_name
         FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'in_progress' LIMIT 1`,
        [doc.id, today]
      );
      const [next] = await db.query(
        `SELECT a.id, a.token_display, a.token_number, a.queue_position, p.name AS patient_name
         FROM appointments a LEFT JOIN patients p ON a.patient_id = p.id
         WHERE a.doctor_id = ? AND a.date = ? AND a.status = 'waiting'
         ORDER BY a.queue_position ASC LIMIT 3`,
        [doc.id, today]
      );
      const [[stats]] = await db.query(
        `SELECT COUNT(*) AS total,
          SUM(status = 'completed')   AS completed,
          SUM(status = 'waiting')     AS waiting,
          SUM(status = 'in_progress') AS in_progress,
          SUM(status = 'cancelled')   AS cancelled
         FROM appointments WHERE doctor_id = ? AND date = ?`,
        [doc.id, today]
      );
      const fmt = (r) => r ? { ...r, patient: { name: r.patient_name } } : null;
      return { ...doc, current: fmt(current), next: next.map(fmt), stats };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getTokenDisplay, getAllTokensDisplay };
