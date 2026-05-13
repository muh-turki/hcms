const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'hcms-super-secret-key-2024';

// Roles hierarchy: admin > supervisor > cashier
const ROLE_LEVEL = { admin: 3, supervisor: 2, cashier: 1 };

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Allows admin + supervisor
function requireSupervisor(req, res, next) {
  const level = ROLE_LEVEL[req.user?.role] || 0;
  if (level < ROLE_LEVEL.supervisor) {
    return res.status(403).json({ error: 'Supervisor or Admin access required' });
  }
  next();
}

module.exports = { generateToken, verifyToken, requireAdmin, requireSupervisor, ROLE_LEVEL };
