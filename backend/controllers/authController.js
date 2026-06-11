const db = require('../db/database');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/tenantAuth');

const tenantLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const [[tenant]] = await db.query(
      "SELECT id, name, username, status, smart_pad_enabled, ocr_enabled FROM tenants WHERE username = ? AND password = ?",
      [username, password]
    );

    if (!tenant) return res.status(401).json({ error: 'Invalid username or password' });
    if (tenant.status === 'suspended') return res.status(403).json({ error: 'Account suspended. Contact superadmin.' });

    const token = jwt.sign({ tenant_id: tenant.id, name: tenant.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, tenant: { id: tenant.id, name: tenant.name, username: tenant.username, smart_pad_enabled: !!tenant.smart_pad_enabled, ocr_enabled: !!tenant.ocr_enabled } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { tenantLogin };
