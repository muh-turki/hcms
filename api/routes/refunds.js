const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireSupervisor } = require('../middleware');

// POST /api/refunds (admin + supervisor)
router.post('/', verifyToken, requireSupervisor, (req, res) => {
  const { sale_id, product_id, quantity, reason } = req.body;
  if (!sale_id || !product_id || !quantity) return res.status(400).json({ error: 'sale_id, product_id, and quantity are required' });
  if (!reason || !reason.trim()) return res.status(400).json({ error: 'Refund reason is strongly required' });

  try {
    db.exec('BEGIN TRANSACTION');

    // Validate sale item exists
    const item = db.prepare('SELECT * FROM sale_items WHERE sale_id = ? AND product_id = ?').get(sale_id, product_id);
    if (!item) throw new Error('Sale item not found');
    if (quantity > item.quantity) throw new Error(`Cannot refund more than purchased quantity (${item.quantity})`);

    // Insert refund
    const result = db.prepare(`
      INSERT INTO refunds (sale_id, product_id, quantity, reason, refunded_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(sale_id, product_id, quantity, reason || null, req.user.id);

    // Restore stock
    db.prepare("UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?")
      .run(quantity, product_id);

    db.exec('COMMIT');

    res.status(201).json(db.prepare('SELECT * FROM refunds WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: err.message });
  }
});

// GET /api/refunds
router.get('/', verifyToken, (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT r.*, 
      p.name as product_name,
      s.invoice_number,
      u.username as refunded_by_name
    FROM refunds r
    JOIN products p ON p.id = r.product_id
    JOIN sales s ON s.id = r.sale_id
    LEFT JOIN users u ON u.id = r.refunded_by
  `;
  const conditions = [];
  const params = [];
  if (from) { conditions.push("date(r.created_at) >= ?"); params.push(from); }
  if (to)   { conditions.push("date(r.created_at) <= ?"); params.push(to); }
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

module.exports = router;
