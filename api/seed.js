const bcrypt = require('bcryptjs');
const db = require('./db');

function seed() {
  console.log('🌱 Seeding database...');

  // ─── Users ───────────────────────────────────────────────────────────────
  const adminHash = bcrypt.hashSync('admin123', 10);
  const staffHash = bcrypt.hashSync('staff123', 10);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, role, full_name)
    VALUES (?, ?, ?, ?)
  `);
  insertUser.run('admin', adminHash, 'admin', 'System Administrator');
  insertUser.run('staff', staffHash, 'staff', 'Front Desk Staff');
  console.log('✅ Users seeded');

  // ─── Products ─────────────────────────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (name, sku, category, cost_price, selling_price, current_stock, min_stock_level, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['Arabic Coffee',     'BEV-001', 'Beverages',  2.00,  8.00,  50, 10, '2026-12-31'],
    ['Turkish Coffee',    'BEV-002', 'Beverages',  2.50,  9.00,  45, 10, '2026-12-31'],
    ['Lemon Mint Juice',  'BEV-003', 'Beverages',  3.00, 12.00,  30, 10, '2026-06-30'],
    ['Orange Juice',      'BEV-004', 'Beverages',  3.50, 12.00,  25, 10, '2026-06-30'],
    ['Water 500ml',       'BEV-005', 'Beverages',  0.50,  2.00, 200, 30, '2027-01-01'],
    ['Water 1.5L',        'BEV-006', 'Beverages',  0.80,  3.00, 100, 20, '2027-01-01'],
    ['Tea',               'BEV-007', 'Beverages',  1.00,  6.00,  60, 15, '2026-12-31'],
    ['Cappuccino',        'BEV-008', 'Beverages',  3.00, 14.00,  20,  8, '2026-12-31'],
    ['Espresso',          'BEV-009', 'Beverages',  2.00, 10.00,  25,  8, '2026-12-31'],
    ['Club Sandwich',     'FOD-001', 'Food',        8.00, 25.00,  15,  5, null],
    ['Caesar Salad',      'FOD-002', 'Food',        6.00, 20.00,  10,  3, null],
    ['French Fries',      'FOD-003', 'Food',        3.00, 12.00,  20,  5, null],
    ['Chocolate Cake',    'DES-001', 'Desserts',    5.00, 18.00,   4,  5, '2026-04-20'],
    ['Kunafa',            'DES-002', 'Desserts',    4.00, 15.00,   3,  5, '2026-04-20'],
    ['Mixed Nuts',        'SNK-001', 'Snacks',      4.00, 16.00,  12,  5, '2026-10-01'],
  ];

  products.forEach(p => insertProduct.run(...p));
  console.log(`✅ ${products.length} products seeded`);

  // ─── Sample Suppliers ─────────────────────────────────────────────────────
  const insertSupplier = db.prepare(`
    INSERT OR IGNORE INTO suppliers (name, phone, email, address)
    VALUES (?, ?, ?, ?)
  `);
  insertSupplier.run('Al-Nour Trading', '+966501234567', 'alnour@example.com', 'Riyadh, KSA');
  insertSupplier.run('Fresh Foods Co.',  '+966507654321', 'fresh@example.com',  'Jeddah, KSA');
  console.log('✅ Suppliers seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('   Admin credentials: admin / admin123');
  console.log('   Staff credentials: staff / staff123\n');
}

seed();
