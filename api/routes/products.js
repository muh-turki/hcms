const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireAdmin, requireSupervisor } = require('../middleware');

// GET /api/products
router.get('/', verifyToken, (req, res) => {
  const { category, lowstock } = req.query;
  let query = `
    SELECT *, 
      CASE WHEN track_stock = 1 AND current_stock <= min_stock_level THEN 1 ELSE 0 END as is_low_stock
    FROM products
  `;
  const params = [];
  const conditions = [];

  if (category) { conditions.push('category = ?'); params.push(category); }
  if (lowstock === '1') conditions.push('track_stock = 1 AND current_stock <= min_stock_level');
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY category, name';

  const products = db.prepare(query).all(...params);
  
  if (req.user.role !== 'admin') {
    products.forEach(p => delete p.cost_price);
  }

  res.json(products);
});

// GET /api/products/categories
router.get('/categories', verifyToken, (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// POST /api/products (admin + supervisor)
router.post('/', verifyToken, requireSupervisor, (req, res) => {
  const { name, name_ar, sku, category, cost_price, selling_price, current_stock, min_stock_level, expiry_date, track_stock, image_data } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Name and category required' });

  const trackStock = track_stock === false || track_stock === 0 ? 0 : 1;
  const result = db.prepare(`
    INSERT INTO products (name, name_ar, sku, category, cost_price, selling_price, current_stock, min_stock_level, expiry_date, track_stock, image_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, name_ar || null, sku || null, category, cost_price || 0, selling_price || 0, trackStock ? (current_stock || 0) : 0, trackStock ? (min_stock_level || 5) : 0, expiry_date || null, trackStock, image_data || null);

  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/products/:id (admin + supervisor)
router.put('/:id', verifyToken, requireSupervisor, (req, res) => {
  const { name, name_ar, sku, category, cost_price, selling_price, current_stock, min_stock_level, expiry_date, track_stock, image_data } = req.body;
  const { id } = req.params;

  const trackStock = track_stock === false || track_stock === 0 ? 0 : 1;
  db.prepare(`
    UPDATE products SET name=?, name_ar=?, sku=?, category=?, cost_price=?, selling_price=?,
      current_stock=?, min_stock_level=?, expiry_date=?, track_stock=?, image_data=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, name_ar || null, sku || null, category, cost_price, selling_price, trackStock ? current_stock : 0, trackStock ? min_stock_level : 0, expiry_date || null, trackStock, image_data || null, id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// DELETE /api/products/:id (admin only)
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ message: 'Product deleted' });
});

module.exports = router;
