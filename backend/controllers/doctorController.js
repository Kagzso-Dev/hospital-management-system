const db = require('../db/database');

const getDoctors = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, specialization, phone, is_active, COALESCE(consultation_fee, 300) as consultation_fee FROM doctors WHERE is_active = 1 AND tenant_id = ? ORDER BY name',
      [req.tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createDoctor = async (req, res) => {
  try {
    const { name, specialization, phone, password } = req.body;
    const [result] = await db.execute(
      'INSERT INTO doctors (tenant_id, name, specialization, phone, password) VALUES (?, ?, ?, ?, ?)',
      [req.tenantId, name, specialization || null, phone || null, password || null]
    );
    const [[doctor]] = await db.query('SELECT id, name, specialization, phone, is_active FROM doctors WHERE id = ?', [result.insertId]);
    res.status(201).json(doctor);
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

const verifyDoctorPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const [[doctor]] = await db.query('SELECT password FROM doctors WHERE id = ? AND is_active = 1 AND tenant_id = ?', [id, req.tenantId]);
    if (!doctor) return res.status(404).json({ ok: false, error: 'Doctor not found' });
    if (!doctor.password) return res.json({ ok: true });
    res.json({ ok: doctor.password === password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const generateSlots = (start, end, duration) => {
  const slots = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h < eh || (h === eh && m < em)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += duration;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
};

const getAvailableSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const dow = dayOfWeek === 0 ? 7 : dayOfWeek;

    let [rows] = await db.query(
      'SELECT * FROM doctor_availability WHERE doctor_id = ? AND date = ? AND tenant_id = ?',
      [id, date, req.tenantId]
    );
    let avail = rows[0];

    if (avail) {
      if (!avail.is_available) return res.json({ slots: [], unavailable: true });
    } else {
      [rows] = await db.query(
        'SELECT * FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ? AND date IS NULL AND is_available = 1 AND tenant_id = ?',
        [id, dow, req.tenantId]
      );
      avail = rows[0];
    }

    if (!avail) return res.json({ slots: [], unavailable: false });

    const allSlots = generateSlots(avail.start_time, avail.end_time, avail.slot_duration);

    const [booked] = await db.query(
      "SELECT time_slot FROM appointments WHERE doctor_id = ? AND date = ? AND status != 'cancelled' AND tenant_id = ?",
      [id, date, req.tenantId]
    );
    const bookedSet = new Set(booked.map((a) => a.time_slot));

    res.json({ slots: allSlots.map((t) => ({ time: t, available: !bookedSet.has(t) })), unavailable: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const setAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, day_of_week, start_time, end_time, slot_duration, is_available } = req.body;
    const tenantId = req.tenantId;

    let [rows] = date
      ? await db.query('SELECT * FROM doctor_availability WHERE doctor_id = ? AND date = ? AND tenant_id = ?', [id, date, tenantId])
      : await db.query('SELECT * FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ? AND date IS NULL AND tenant_id = ?', [id, day_of_week, tenantId]);

    const existing = rows[0];
    let avail;

    if (existing) {
      await db.execute(
        'UPDATE doctor_availability SET start_time=?, end_time=?, slot_duration=?, is_available=? WHERE id=?',
        [start_time, end_time, slot_duration || 15, is_available !== false ? 1 : 0, existing.id]
      );
      [[avail]] = await db.query('SELECT * FROM doctor_availability WHERE id = ?', [existing.id]);
    } else {
      const [result] = await db.execute(
        'INSERT INTO doctor_availability (tenant_id, doctor_id, date, day_of_week, start_time, end_time, slot_duration, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, id, date || null, date ? null : day_of_week, start_time, end_time, slot_duration || 15, 1]
      );
      [[avail]] = await db.query('SELECT * FROM doctor_availability WHERE id = ?', [result.insertId]);
    }
    res.json(avail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDoctors, createDoctor, deleteDoctor, verifyDoctorPassword, getAvailableSlots, setAvailability };
