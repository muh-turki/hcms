const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware');

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings (Admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');
    for (const [key, value] of Object.entries(req.body)) {
      db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `).run(key, String(value));
    }
    db.exec('COMMIT');
    
    // Return updated settings
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
