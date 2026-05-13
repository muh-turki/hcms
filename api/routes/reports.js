const router = require('express').Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware');

// GET /api/reports/daily?date=YYYY-MM-DD
router.get('/daily', verifyToken, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const isAdmin = req.user.role === 'admin';

  const summary = db.prepare(`
    SELECT 
      COUNT(DISTINCT s.id) as total_transactions,
      COALESCE(SUM(s.total_amount), 0) as total_revenue,
      COALESCE(SUM(s.tax_amount), 0) as total_tax,
      ${isAdmin ? 'COALESCE(SUM((si.price - p.cost_price) * si.quantity), 0)' : '0'} as total_profit
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE date(s.created_at) = ?
  `).get(date);

  const byPayment = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
    FROM sales WHERE date(created_at) = ?
    GROUP BY payment_method
  `).all(date);

  const topItems = db.prepare(`
    SELECT p.name, p.category, SUM(si.quantity) as qty_sold, SUM(si.quantity * si.price) as revenue
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    JOIN products p ON p.id = si.product_id
    WHERE date(s.created_at) = ?
    GROUP BY p.id ORDER BY qty_sold DESC LIMIT 10
  `).all(date);

  const salesList = db.prepare(`
    SELECT s.*, u.username as cashier
    FROM sales s LEFT JOIN users u ON u.id = s.user_id
    WHERE date(s.created_at) = ?
    ORDER BY s.created_at DESC
  `).all(date);

  res.json({ date, summary, byPayment, topItems, salesList });
});

// GET /api/reports/monthly?year=YYYY&month=MM
router.get('/monthly', verifyToken, (req, res) => {
  const now = new Date();
  const year  = req.query.year  || now.getFullYear();
  const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const isAdmin = req.user.role === 'admin';

  const byDay = db.prepare(`
    SELECT date(s.created_at) as day,
      COUNT(DISTINCT s.id) as transactions,
      SUM(s.total_amount) as revenue,
      ${isAdmin ? 'SUM((si.price - p.cost_price) * si.quantity)' : '0'} as profit
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE strftime('%Y-%m', s.created_at) = ?
    GROUP BY day ORDER BY day ASC
  `).all(prefix);

  const summary = db.prepare(`
    SELECT 
      COUNT(DISTINCT s.id) as total_transactions,
      COALESCE(SUM(s.total_amount), 0) as total_revenue,
      COALESCE(SUM(s.tax_amount), 0) as total_tax,
      ${isAdmin ? 'COALESCE(SUM((si.price - p.cost_price) * si.quantity), 0)' : '0'} as total_profit
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE strftime('%Y-%m', s.created_at) = ?
  `).get(prefix);

  res.json({ year, month, summary, byDay });
});

// GET /api/reports/inventory (admin only)
router.get('/inventory', verifyToken, requireAdmin, (req, res) => {
  const products = db.prepare(`
    SELECT *,
      (selling_price - cost_price) as margin,
      CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END as is_low_stock,
      current_stock * cost_price as stock_value
    FROM products ORDER BY category, name
  `).all();

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_products,
      SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
      SUM(current_stock * cost_price) as total_stock_value
    FROM products
  `).get();

  res.json({ summary, products });
});

// GET /api/reports/room/:room
router.get('/room/:room', verifyToken, (req, res) => {
  const { room } = req.params;
  const { from, to } = req.query;

  let q = `
    SELECT s.id as sale_id, s.invoice_number, s.created_at, s.payment_method,
      s.total_amount, u.username as cashier,
      json_group_array(json_object(
        'product_name', p.name,
        'quantity', si.quantity,
        'price', si.price,
        'subtotal', si.quantity * si.price
      )) as items
    FROM sales s
    JOIN sale_items si ON si.sale_id = s.id
    JOIN products p ON p.id = si.product_id
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.room_number = ?
  `;
  const params = [room];
  if (from) { q += ' AND date(s.created_at) >= ?'; params.push(from); }
  if (to)   { q += ' AND date(s.created_at) <= ?'; params.push(to); }
  q += ' GROUP BY s.id ORDER BY s.created_at DESC';

  const sales = db.prepare(q).all(...params).map(s => ({ ...s, items: JSON.parse(s.items) }));

  // Aggregate by product
  const productMap = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!productMap[item.product_name]) productMap[item.product_name] = { product_name: item.product_name, total_qty: 0, total_amount: 0 };
      productMap[item.product_name].total_qty    += item.quantity;
      productMap[item.product_name].total_amount += item.subtotal;
    }
  }

  res.json({
    room,
    sales,
    summary: Object.values(productMap).sort((a, b) => b.total_qty - a.total_qty),
    total: sales.reduce((sum, s) => sum + s.total_amount, 0)
  });
});

// GET /api/reports/profit (admin only)
router.get('/profit', verifyToken, requireAdmin, (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT 
      p.id, p.name, p.category, p.cost_price, p.selling_price,
      COALESCE(SUM(si.quantity), 0) as qty_sold,
      COALESCE(SUM(si.quantity * si.price), 0) as revenue,
      COALESCE(SUM(si.quantity * p.cost_price), 0) as cost,
      COALESCE(SUM(si.quantity * (si.price - p.cost_price)), 0) as profit
    FROM products p
    LEFT JOIN sale_items si ON si.product_id = p.id
    LEFT JOIN sales s ON s.id = si.sale_id
  `;
  const conditions = [];
  const params = [];
  if (from) { conditions.push('date(s.created_at) >= ?'); params.push(from); }
  if (to)   { conditions.push('date(s.created_at) <= ?'); params.push(to); }
  if (conditions.length) q += ' WHERE ' + conditions.join(' AND ');
  q += ' GROUP BY p.id ORDER BY profit DESC';

  const rows = db.prepare(q).all(...params);
  const totals = rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    cost: acc.cost + r.cost,
    profit: acc.profit + r.profit
  }), { revenue: 0, cost: 0, profit: 0 });

  res.json({ rows, totals });
});

// GET /api/reports/smart
router.get('/smart', verifyToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const prefix = new Date().toISOString().slice(0, 7); // current month

  const mostSold = db.prepare(`
    SELECT p.name, SUM(si.quantity) as qty
    FROM sale_items si JOIN products p ON p.id = si.product_id
    GROUP BY p.id ORDER BY qty DESC LIMIT 1
  `).get() || { name: '-', qty: 0 };

  const leastSold = db.prepare(`
    SELECT p.name, COALESCE(SUM(si.quantity), 0) as qty
    FROM products p
    LEFT JOIN sale_items si ON si.product_id = p.id
    GROUP BY p.id ORDER BY qty ASC, p.id DESC LIMIT 1
  `).get() || { name: '-', qty: 0 };

  const byDay = db.prepare(`
    SELECT date(s.created_at) as day,
      ${isAdmin ? 'SUM((si.price - p.cost_price) * si.quantity)' : '0'} as profit
    FROM sales s
    LEFT JOIN sale_items si ON si.sale_id = s.id
    LEFT JOIN products p ON p.id = si.product_id
    WHERE strftime('%Y-%m', s.created_at) = ?
    GROUP BY day ORDER BY day ASC
  `).all(prefix);

  res.json({ mostSold, leastSold, byDay });
});

// GET /api/reports/logs (admin only)
router.get('/logs', verifyToken, requireAdmin, (req, res) => {
  const logs = db.prepare(`
    SELECT 'Sale' as type, s.created_at, u.username as user, s.invoice_number as reference, 'New Order' as details
    FROM sales s LEFT JOIN users u ON u.id = s.user_id
    UNION ALL
    SELECT 'Refund' as type, r.created_at, u.username as user, s.invoice_number as reference, r.reason as details
    FROM refunds r LEFT JOIN sales s ON s.id = r.sale_id LEFT JOIN users u ON u.id = r.refunded_by
    ORDER BY created_at DESC LIMIT 100
  `).all();
  res.json(logs);
});

// GET /api/reports/employees (admin only)
router.get('/employees', verifyToken, requireAdmin, (req, res) => {
  const employees = db.prepare(`
    SELECT 
      u.id, u.username, u.full_name, u.role,
      (SELECT COUNT(*) FROM sales s WHERE s.user_id = u.id) as total_sales_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales s WHERE s.user_id = u.id) as total_revenue,
      (SELECT COUNT(*) FROM refunds r WHERE r.refunded_by = u.id) as total_refunds
    FROM users u
    ORDER BY total_sales_count DESC
  `).all();
  res.json(employees);
});

module.exports = router;
