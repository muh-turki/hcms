const router = require('express').Router();
const db = require('../db');

// GET /api/guest/menu
// Public endpoint for guest to fetch available products
router.get('/menu', (req, res) => {
  // Only return in-stock items. Hide cost price.
  const menu = db.prepare(`
    SELECT id, name, name_ar, category, selling_price, current_stock, created_at,
      CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END as out_of_stock
    FROM products
    ORDER BY category, name
  `).all();
  
  const settingsRows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const r of settingsRows) settings[r.key] = r.value;

  res.json({ menu, settings });
});

// POST /api/guest/orders
// Public endpoint to place an order from room
router.post('/orders', (req, res) => {
  const { room_number, cart, notes } = req.body;
  if (!room_number) return res.status(400).json({ error: 'Room number is required' });
  if (!cart || !cart.length) return res.status(400).json({ error: 'Cart is empty' });

  try {
    db.exec('BEGIN TRANSACTION');

    let total = 0;
    const finalItems = [];

    // Validate stock and calculate true price
    for (const item of cart) {
      const dbProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
      if (!dbProduct) throw new Error(`Product not found: ${item.name}`);
      if (dbProduct.current_stock < item.quantity) {
        throw new Error(`Not enough stock for ${dbProduct.name}`);
      }
      total += dbProduct.selling_price * item.quantity;
      finalItems.push({
        ...item,
        price: dbProduct.selling_price,
        name: dbProduct.name
      });
    }

    // Create guest order
    const result = db.prepare(`
      INSERT INTO guest_orders (room_number, total_amount, notes) VALUES (?, ?, ?)
    `).run(room_number, total, notes || null);
    const orderId = result.lastInsertRowid;

    // Insert items
    const insertItem = db.prepare('INSERT INTO guest_order_items (guest_order_id, product_id, quantity, price, product_name) VALUES (?, ?, ?, ?, ?)');
    for (const it of finalItems) {
      insertItem.run(orderId, it.id, it.quantity, it.price, it.name);
    }

    db.exec('COMMIT');
    res.status(201).json({ id: orderId, message: 'Order placed successfully' });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: err.message });
  }
});

// GET /api/guest/orders/:id/status
// Poll order status
router.get('/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const order = db.prepare('SELECT status, total_amount FROM guest_orders WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

module.exports = router;
