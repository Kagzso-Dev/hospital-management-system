const db = require('../db/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/tenantAuth');

const superadminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [[admin]] = await db.query(
      'SELECT id, username FROM superadmin WHERE username = ? AND password = ?',
      [username, password]
    );
    if (!admin) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ is_superadmin: true, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, admin: { username: admin.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listTenants = async (req, res) => {
  try {
    const [tenants] = await db.query(
      `SELECT t.id, t.name, t.username, t.status, t.created_at,
        (SELECT COUNT(*) FROM doctors d WHERE d.tenant_id = t.id AND d.is_active = 1) AS doctor_count,
        (SELECT COUNT(*) FROM patients p WHERE p.tenant_id = t.id) AS patient_count
       FROM tenants t ORDER BY t.id`
    );
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTenant = async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'name, username, password required' });

    const [[existing]] = await db.query('SELECT id FROM tenants WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const [result] = await db.execute(
      'INSERT INTO tenants (name, username, password) VALUES (?, ?, ?)',
      [name, username, password]
    );
    const [[tenant]] = await db.query('SELECT id, name, username, status, created_at FROM tenants WHERE id = ?', [result.insertId]);
    res.status(201).json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateTenantStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'status must be active or suspended' });

    await db.execute('UPDATE tenants SET status = ? WHERE id = ?', [status, id]);
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateTenantPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.trim().length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    await db.execute('UPDATE tenants SET password = ? WHERE id = ?', [password.trim(), id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { superadminLogin, listTenants, createTenant, updateTenantStatus, updateTenantPassword };
