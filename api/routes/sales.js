const router = require('express').Router();
const db = require('../db');
const { verifyToken } = require('../middleware');

// Generate invoice number: INV-YYYYMMDD-NNNN
function generateInvoiceNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  db.prepare(`
    INSERT INTO invoice_counters (date_str, counter) VALUES (?, 1)
    ON CONFLICT(date_str) DO UPDATE SET counter = counter + 1
  `).run(today);
  const { counter } = db.prepare('SELECT counter FROM invoice_counters WHERE date_str = ?').get(today);
  return `INV-${today}-${String(counter).padStart(4, '0')}`;
}

// POST /api/sales
router.post('/', verifyToken, (req, res) => {
  const { items, payment_method, room_number, apply_tax } = req.body;

  if (!room_number) return res.status(400).json({ error: 'Room number is required' });
  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });

  try {
    db.exec('BEGIN TRANSACTION');

    // Validate + calculate
    let subtotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      // Only check stock for tracked products
      if (product.track_stock && product.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}" (available: ${product.current_stock})`);
      }
      subtotal += product.selling_price * item.quantity;
      itemDetails.push({ product, quantity: item.quantity, price: product.selling_price });
    }

    const tax_amount = apply_tax ? parseFloat((subtotal * 0.15).toFixed(2)) : 0;
    const total_amount = parseFloat((subtotal + tax_amount).toFixed(2));
    const invoice_number = generateInvoiceNumber();

    // Insert sale
    const saleResult = db.prepare(`
      INSERT INTO sales (invoice_number, total_amount, tax_amount, payment_method, room_number, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(invoice_number, total_amount, tax_amount, payment_method || 'Cash', room_number, req.user.id);

    const sale_id = saleResult.lastInsertRowid;

    // Insert items + deduct stock (only for tracked products)
    for (const { product, quantity, price } of itemDetails) {
      db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
        .run(sale_id, product.id, quantity, price);
      if (product.track_stock) {
        db.prepare("UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now') WHERE id = ?")
          .run(quantity, product.id);
      }
    }

    db.exec('COMMIT');

    // Fetch full sale with items
    const sale = db.prepare(`
      SELECT s.*, u.username as cashier, u.full_name
      FROM sales s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
    `).get(sale_id);

    const saleItems = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ?
    `).all(sale_id).map(i => ({ ...i, subtotal: i.quantity * i.price }));

    res.status(201).json({ ...sale, items: saleItems });
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    res.status(400).json({ error: err.message });
  }
});

// GET /api/sales
router.get('/', verifyToken, (req, res) => {
  const { from, to, room, payment_method, limit = 50, offset = 0 } = req.query;
  let q = `
    SELECT s.*, u.username as cashier,
      COUNT(si.id) as item_count
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN sale_items si ON si.sale_id = s.id
  `;
  const conditions = [];
  const params = [];
  if (from) { conditions.push("date(s.created_at) >= ?"); params.push(from); }
  if (to)   { conditions.push("date(s.created_at) <= ?"); params.push(to); }
  if (room) { conditions.push("s.room_number = ?"); params.push(room); }
  if (payment_method) { conditions.push("s.payment_method = ?"); params.push(payment_method); }
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ' GROUP BY s.id ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  res.json(db.prepare(q).all(...params));
});

// GET /api/sales/:id
router.get('/:id', verifyToken, (req, res) => {
  const sale = db.prepare('SELECT s.*, u.full_name as cashier FROM sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = ?').get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  const items = db.prepare(`
    SELECT si.*, p.name as product_name, p.sku 
    FROM sale_items si JOIN products p ON p.id = si.product_id 
    WHERE si.sale_id = ?
  `).all(req.params.id);
  res.json({ ...sale, items });
});

module.exports = router;
