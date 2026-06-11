const db = require('../db/database');

const getDoctors = async (req, res) => {
  try {
    const [doctors] = await db.query(
      'SELECT id, name, specialization, phone, is_active FROM doctors WHERE is_active = 1 AND tenant_id = ? ORDER BY id',
      [req.tenantId]
    );
    for (const doc of doctors) {
      const [avail] = await db.query(
        `SELECT da.*, d.name AS substitute_name
         FROM doctor_availability da
         LEFT JOIN doctors d ON da.substitute_doctor_id = d.id
         WHERE da.doctor_id = ? AND da.tenant_id = ?
         ORDER BY da.day_of_week, da.date`,
        [doc.id, req.tenantId]
      );
      doc.availability = avail;
    }
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDateAvailability = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const [[override]] = await db.query(
      'SELECT * FROM doctor_availability WHERE doctor_id = ? AND date = ? AND tenant_id = ?',
      [doctor_id, date, req.tenantId]
    );
    if (!override) {
      const d = new Date(date);
      const dow = d.getDay() === 0 ? 7 : d.getDay();
      const [[weekly]] = await db.query(
        'SELECT * FROM doctor_availability WHERE doctor_id = ? AND date IS NULL AND day_of_week = ? AND tenant_id = ?',
        [doctor_id, dow, req.tenantId]
      );
      return res.json(weekly || null);
    }
    res.json(override);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const setDateAvailability = async (req, res) => {
  try {
    const { doctor_id, date, is_available, start_time, end_time, slot_duration, substitute_doctor_id } = req.body;
    const tenantId = req.tenantId;
    const subId = substitute_doctor_id ? Number(substitute_doctor_id) : null;

    const [[existing]] = await db.query(
      'SELECT id FROM doctor_availability WHERE doctor_id = ? AND date = ? AND tenant_id = ?',
      [doctor_id, date, tenantId]
    );

    if (existing) {
      await db.execute(
        'UPDATE doctor_availability SET is_available=?, start_time=?, end_time=?, slot_duration=?, substitute_doctor_id=? WHERE doctor_id=? AND date=? AND tenant_id=?',
        [is_available ? 1 : 0, start_time, end_time, slot_duration || 15, subId, doctor_id, date, tenantId]
      );
    } else {
      await db.execute(
        'INSERT INTO doctor_availability (tenant_id, doctor_id, date, day_of_week, start_time, end_time, slot_duration, is_available, substitute_doctor_id) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)',
        [tenantId, doctor_id, date, start_time, end_time, slot_duration || 15, is_available ? 1 : 0, subId]
      );
    }

    const [[updated]] = await db.query(
      'SELECT * FROM doctor_availability WHERE doctor_id = ? AND date = ? AND tenant_id = ?',
      [doctor_id, date, tenantId]
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const setWeeklySchedule = async (req, res) => {
  try {
    const { doctor_id, day_of_week, is_available, start_time, end_time, slot_duration, substitute_doctor_id } = req.body;
    const tenantId = req.tenantId;
    const subId = substitute_doctor_id || null;

    const [[existing]] = await db.query(
      'SELECT id FROM doctor_availability WHERE doctor_id = ? AND date IS NULL AND day_of_week = ? AND tenant_id = ?',
      [doctor_id, day_of_week, tenantId]
    );

    if (existing) {
      await db.execute(
        'UPDATE doctor_availability SET is_available=?, start_time=?, end_time=?, slot_duration=?, substitute_doctor_id=? WHERE doctor_id=? AND date IS NULL AND day_of_week=? AND tenant_id=?',
        [is_available ? 1 : 0, start_time, end_time, slot_duration || 15, subId, doctor_id, day_of_week, tenantId]
      );
    } else {
      await db.execute(
        'INSERT INTO doctor_availability (tenant_id, doctor_id, date, day_of_week, start_time, end_time, slot_duration, is_available, substitute_doctor_id) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)',
        [tenantId, doctor_id, day_of_week, start_time, end_time, slot_duration || 15, is_available ? 1 : 0, subId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDateAppointments = async (req, res) => {
  try {
    const { doctor_id, date } = req.query;
    const [rows] = await db.query(
      `SELECT a.*, p.name as patient_name, p.phone as patient_phone, p.patient_id as patient_code
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = ? AND a.date = ? AND a.tenant_id = ? AND a.status NOT IN ('cancelled')
       ORDER BY a.queue_position`,
      [doctor_id, date, req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reassignAppointments = async (req, res) => {
  try {
    const { from_doctor_id, to_doctor_id, date } = req.body;
    const tenantId = req.tenantId;

    const [appointments] = await db.query(
      "SELECT * FROM appointments WHERE doctor_id = ? AND date = ? AND status = 'waiting' AND tenant_id = ?",
      [from_doctor_id, date, tenantId]
    );

    if (appointments.length === 0) return res.json({ reassigned: 0 });

    const [[{ maxToken }]] = await db.query(
      "SELECT COUNT(*) as maxToken FROM appointments WHERE doctor_id = ? AND date = ? AND status != 'cancelled' AND tenant_id = ?",
      [to_doctor_id, date, tenantId]
    );

    await db.transaction(async (conn) => {
      for (let i = 0; i < appointments.length; i++) {
        const apt = appointments[i];
        const newToken = maxToken + i + 1;
        const newDisplay = `D${to_doctor_id}-${String(newToken).padStart(3, '0')}`;
        await conn.execute(
          'UPDATE appointments SET doctor_id=?, token_number=?, token_display=?, queue_position=? WHERE id=?',
          [to_doctor_id, newToken, newDisplay, newToken, apt.id]
        );
      }
    });

    if (req.io) req.io.emit(`token_update_${tenantId}`, { doctor_id: to_doctor_id });
    res.json({ reassigned: appointments.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE doctors SET is_active = 0 WHERE id = ? AND tenant_id = ?', [id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    let { from, to, doctor_id } = req.query;
    const tenantId = req.tenantId;
    const today = new Date().toISOString().slice(0, 10);
    from = from || today;
    to   = to   || today;

    const dFilter = doctor_id ? 'AND doctor_id = ?' : '';
    const dParam  = doctor_id ? [doctor_id] : [];

    const [[summary]] = await db.query(
      `SELECT COUNT(*) AS total, SUM(status='completed') AS completed, SUM(status='waiting') AS waiting,
        SUM(status='in_progress') AS in_progress, SUM(status='cancelled') AS cancelled
       FROM appointments WHERE tenant_id = ? AND date BETWEEN ? AND ? ${dFilter}`,
      [tenantId, from, to, ...dParam]
    );

    const [byDoctor] = await db.query(
      `SELECT d.id, d.name, d.specialization,
        COUNT(a.id) AS total, SUM(a.status='completed') AS completed,
        SUM(a.status='waiting') AS waiting, SUM(a.status='in_progress') AS in_progress,
        SUM(a.status='cancelled') AS cancelled
       FROM doctors d
       LEFT JOIN appointments a ON d.id = a.doctor_id AND a.date BETWEEN ? AND ? AND a.tenant_id = ?
         ${doctor_id ? 'AND a.doctor_id = ?' : ''}
       WHERE d.is_active = 1 AND d.tenant_id = ? ${doctor_id ? 'AND d.id = ?' : ''}
       GROUP BY d.id, d.name, d.specialization ORDER BY total DESC`,
      doctor_id ? [from, to, tenantId, doctor_id, tenantId, doctor_id] : [from, to, tenantId, tenantId]
    );

    const [dailyTrend] = await db.query(
      `SELECT date, COUNT(*) AS total, SUM(status='completed') AS completed,
        SUM(status='cancelled') AS cancelled, SUM(status IN ('waiting','in_progress')) AS pending
       FROM appointments WHERE tenant_id = ? AND date BETWEEN ? AND ? ${dFilter}
       GROUP BY date ORDER BY date`,
      [tenantId, from, to, ...dParam]
    );

    const [[patientStats]] = await db.query(
      `SELECT COUNT(DISTINCT patient_id) AS unique_patients
       FROM appointments WHERE tenant_id = ? AND date BETWEEN ? AND ? ${dFilter}`,
      [tenantId, from, to, ...dParam]
    );

    const [peakHours] = await db.query(
      `SELECT SUBSTRING(time_slot, 1, 2) AS hour, COUNT(*) AS count
       FROM appointments
       WHERE tenant_id = ? AND date BETWEEN ? AND ? AND status != 'cancelled' AND time_slot IS NOT NULL ${dFilter}
       GROUP BY hour ORDER BY hour`,
      [tenantId, from, to, ...dParam]
    );

    const [dayOfWeek] = await db.query(
      `SELECT DAYOFWEEK(date) AS dow, COUNT(*) AS total, SUM(status='completed') AS completed
       FROM appointments WHERE tenant_id = ? AND date BETWEEN ? AND ? ${dFilter}
       GROUP BY dow ORDER BY dow`,
      [tenantId, from, to, ...dParam]
    );

    res.json({ summary, byDoctor, dailyTrend, patientStats, peakHours, dayOfWeek });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resetDoctorPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.trim().length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    await db.execute('UPDATE doctors SET password = ? WHERE id = ? AND tenant_id = ?', [password.trim(), id, req.tenantId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getRegistrations = async (req, res) => {
  try {
    const { date, from, to, search } = req.query;
    const tenantId = req.tenantId;

    let conditions = ['p.tenant_id = ?'];
    let params = [tenantId];

    if (date) {
      conditions.push('DATE(p.created_at) = ?');
      params.push(date);
    } else if (from && to) {
      conditions.push('DATE(p.created_at) BETWEEN ? AND ?');
      params.push(from, to);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.phone LIKE ? OR p.patient_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [patients] = await db.query(
      `SELECT p.*, COUNT(a.id) AS visit_count
       FROM patients p
       LEFT JOIN appointments a ON a.patient_id = p.id AND a.tenant_id = p.tenant_id
       WHERE ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 500`,
      params
    );

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

    const [[todayStat]] = await db.query(
      'SELECT COUNT(*) AS count FROM patients WHERE tenant_id = ? AND DATE(created_at) = ?',
      [tenantId, today]
    );
    const [[weekStat]] = await db.query(
      'SELECT COUNT(*) AS count FROM patients WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?',
      [tenantId, weekAgo, today]
    );
    const [[totalStat]] = await db.query(
      'SELECT COUNT(*) AS count FROM patients WHERE tenant_id = ?',
      [tenantId]
    );

    res.json({
      patients,
      stats: { today: todayStat.count, week: weekStat.count, total: totalStat.count },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const [[row]] = await db.query(
      'SELECT hospital_name, hospital_tagline, procedure_charge_enabled, smart_pad_enabled, ocr_enabled FROM tenants WHERE id = ?',
      [req.tenantId]
    );
    res.json(row || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { hospital_name, hospital_tagline, procedure_charge_enabled } = req.body;
    await db.execute(
      'UPDATE tenants SET hospital_name = ?, hospital_tagline = ?, procedure_charge_enabled = ? WHERE id = ?',
      [hospital_name || null, hospital_tagline || null, procedure_charge_enabled ? 1 : 0, req.tenantId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDoctors, deleteDoctor, resetDoctorPassword, getAnalytics, getDateAvailability, setDateAvailability, setWeeklySchedule, getDateAppointments, reassignAppointments, getRegistrations, getSettings, updateSettings };
