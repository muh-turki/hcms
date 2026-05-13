const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../middleware');

// GET /api/orders (staff - get pending guest orders)
router.get('/', verifyToken, (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM guest_orders 
    WHERE status IN ('pending', 'accepted')
    ORDER BY created_at ASC
  `).all();

  const getItems = db.prepare('SELECT * FROM guest_order_items WHERE guest_order_id = ?');
  const result = orders.map(o => ({
    ...o,
    items: getItems.all(o.id)
  }));

  res.json(result);
});

// POST /api/orders/:id/accept
router.post('/:id/accept', verifyToken, (req, res) => {
  const result = db.prepare("UPDATE guest_orders SET status = 'accepted' WHERE id = ? AND status = 'pending'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found or not pending' });
  res.json({ message: 'Order accepted' });
});

// POST /api/orders/:id/complete
router.post('/:id/complete', verifyToken, (req, res) => {
  const { id } = req.params;
  const { apply_tax = true } = req.body;
  const userId = req.user.id;

  try {
    db.exec('BEGIN TRANSACTION');

    const order = db.prepare('SELECT * FROM guest_orders WHERE id = ? AND status = ?').get(id, 'accepted');
    if (!order) throw new Error('Order not found or not accepted');

    const items = db.prepare('SELECT * FROM guest_order_items WHERE guest_order_id = ?').all(id);

    // 1. Verify exact stock available before completing
    for (const it of items) {
      const p = db.prepare('SELECT current_stock, name FROM products WHERE id = ?').get(it.product_id);
      if (!p || p.current_stock < it.quantity) {
         throw new Error(`Insufficient stock for ${p?.name || 'Product ' + it.product_id}`);
      }
    }

    // 2. Generate invoice number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let counter = 1;
    const row = db.prepare('SELECT counter FROM invoice_counters WHERE date_str = ?').get(dateStr);
    if (row) counter = row.counter + 1;
    db.prepare(`
      INSERT INTO invoice_counters (date_str, counter) VALUES (?, ?)
      ON CONFLICT(date_str) DO UPDATE SET counter = excluded.counter
    `).run(dateStr, counter);
    const invoice_number = `INV-${dateStr}-${String(counter).padStart(4, '0')}`;

    // 3. Tax Check (from settings or request)
    const tax_amount = apply_tax ? order.total_amount * 0.15 : 0;
    const final_total = order.total_amount + tax_amount;

    // 4. Create Sale
    const saleRes = db.prepare(`
      INSERT INTO sales (invoice_number, total_amount, tax_amount, payment_method, room_number, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoice_number, final_total, tax_amount, 'Room Charge', order.room_number, userId);
    const saleId = saleRes.lastInsertRowid;

    // 5. Transfer items and deduct stock
    for (const it of items) {
      db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)').run(saleId, it.product_id, it.quantity, it.price);
      db.prepare('UPDATE products SET current_stock = current_stock - ? WHERE id = ?').run(it.quantity, it.product_id);
    }

    // 6. Mark guest order as completed
    db.prepare("UPDATE guest_orders SET status = 'completed' WHERE id = ?").run(id);

    db.exec('COMMIT');
    res.json({ message: 'Order completed and sale generated', invoice_number });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: err.message });
  }
});

// POST /api/orders/:id/reject
router.post('/:id/reject', verifyToken, (req, res) => {
  const result = db.prepare("UPDATE guest_orders SET status = 'rejected' WHERE id = ? AND status IN ('pending', 'accepted')").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Order not found or already processed' });
  res.json({ message: 'Order rejected' });
});

module.exports = router;
