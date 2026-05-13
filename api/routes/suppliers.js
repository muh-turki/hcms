const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware');

const cols = 'id, name, phone, email, address, created_at';

router.get('/', verifyToken, (req, res) => {
  res.json(db.prepare(`SELECT ${cols} FROM suppliers ORDER BY name`).all());
});

router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = db.prepare('INSERT INTO suppliers (name, phone, email, address) VALUES (?, ?, ?, ?)').run(name, phone||null, email||null, address||null);
  res.status(201).json(db.prepare(`SELECT ${cols} FROM suppliers WHERE id = ?`).get(r.lastInsertRowid));
});

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, email, address } = req.body;
  db.prepare('UPDATE suppliers SET name=?, phone=?, email=?, address=? WHERE id=?').run(name, phone||null, email||null, address||null, req.params.id);
  res.json(db.prepare(`SELECT ${cols} FROM suppliers WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
