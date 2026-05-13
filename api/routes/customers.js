const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware');

router.get('/', verifyToken, (req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY name').all());
});

router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const r = db.prepare('INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)').run(name, phone||null, notes||null);
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(r.lastInsertRowid));
});

router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { name, phone, notes } = req.body;
  db.prepare('UPDATE customers SET name=?, phone=?, notes=? WHERE id=?').run(name, phone||null, notes||null, req.params.id);
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const r = db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
