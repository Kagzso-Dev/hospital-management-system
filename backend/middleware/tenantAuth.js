const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'hospital_jwt_secret_2024';

const tenantAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.tenant_id) return res.status(403).json({ error: 'Invalid tenant token' });
    req.tenantId = decoded.tenant_id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const superadminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.is_superadmin) return res.status(403).json({ error: 'Superadmin access only' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { tenantAuth, superadminAuth, JWT_SECRET };
