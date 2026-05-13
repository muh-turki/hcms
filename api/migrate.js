const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'hcms.db'));

try {
  db.exec('PRAGMA foreign_keys=OFF;');
  db.exec('BEGIN TRANSACTION;');
  
  db.exec(`
    CREATE TABLE sales_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      total_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK(payment_method IN ('Cash','Mada','Visa','MasterCard','Room Charge')),
      room_number TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      user_id INTEGER REFERENCES users(id)
    )
  `);

  db.exec('INSERT INTO sales_new SELECT * FROM sales;');
  db.exec('DROP TABLE sales;');
  db.exec('ALTER TABLE sales_new RENAME TO sales;');
  
  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys=ON;');
  console.log('Migration successful: Added Room Charge to payment_methods.');
} catch (e) {
  try { db.exec('ROLLBACK;'); } catch {}
  console.error('Migration failed:', e.message);
}
