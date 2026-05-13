// Uses the built-in node:sqlite module (Node.js v22.5+, stable in v24)
// No npm install required - zero native compilation
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve(process.cwd(), 'api', 'hcms.db');
const db = new DatabaseSync(DB_PATH);

// WAL mode is incompatible with read-only filesystems (Vercel)
// db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── Schema Migrations ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('admin','supervisor','cashier','staff')),
    full_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_ar TEXT,
    sku TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    expiry_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    total_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK(payment_method IN ('Cash','Mada','Visa','MasterCard','Room Charge')),
    room_number TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    user_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    refunded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoice_counters (
    date_str TEXT PRIMARY KEY,
    counter INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS guest_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'rejected')),
    total_amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guest_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_order_id INTEGER NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    product_name TEXT NOT NULL
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('hotel_name', 'مقهى الفندق');
`);

// ─── Incremental Migrations (safe on existing DBs) ────────────────────────────────────────
try { db.exec(`ALTER TABLE products ADD COLUMN name_ar TEXT`); } catch {}
try { db.exec(`ALTER TABLE products ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 1`); } catch {}

// Migrate old 'staff' role to 'cashier'
try { db.exec(`UPDATE users SET role = 'cashier' WHERE role = 'staff'`); } catch {}

// ─── Auto-seed default admin if no users exist (fresh deployment) ─────────────
const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
if (userCount.cnt === 0) {
  console.log('🌱 No users found — creating default admin and cashier...');
  const bcrypt = require('bcryptjs');
  const adminHash = bcrypt.hashSync('admin123', 10);
  const cashierHash = bcrypt.hashSync('staff123', 10);
  db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
    .run('admin', adminHash, 'admin', 'System Administrator');
  db.prepare('INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
    .run('staff', cashierHash, 'cashier', 'Front Desk Staff');
  console.log('✅ Default users created: admin/admin123, staff/staff123');
}

module.exports = db;
