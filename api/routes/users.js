const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware');

// GET /api/users (admin only)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, username, role, full_name, created_at FROM users ORDER BY created_at DESC').all());
});

// POST /api/users (admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { username, password, role, full_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const r = db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
      .run(username, hash, role || 'staff', full_name || null);
    res.status(201).json(db.prepare('SELECT id, username, role, full_name FROM users WHERE id = ?').get(r.lastInsertRowid));
  } catch {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// PUT /api/users/:id (admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { username, password, role, full_name } = req.body;
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET username=?, password_hash=?, role=?, full_name=? WHERE id=?')
      .run(username, hash, role, full_name || null, req.params.id);
  } else {
    db.prepare('UPDATE users SET username=?, role=?, full_name=? WHERE id=?')
      .run(username, role, full_name || null, req.params.id);
  }
  res.json(db.prepare('SELECT id, username, role, full_name FROM users WHERE id = ?').get(req.params.id));
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const r = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
