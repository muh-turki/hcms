const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'hcms.db'));

try {
  db.exec('PRAGMA foreign_keys=OFF;');
  db.exec('BEGIN TRANSACTION;');
  
  db.exec(`
    CREATE TABLE guest_orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'completed', 'rejected')),
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec("INSERT INTO guest_orders_new (id, room_number, status, total_amount, created_at) SELECT id, room_number, CASE WHEN status = 'approved' THEN 'completed' ELSE status END, total_amount, created_at FROM guest_orders;");
  db.exec('DROP TABLE guest_orders;');
  db.exec('ALTER TABLE guest_orders_new RENAME TO guest_orders;');
  
  // Set default settings
  db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('qr_enabled', 'true')");
  db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('qr_hours', '00:00-23:59')");
  db.exec("INSERT OR IGNORE INTO settings (key, value) VALUES ('qr_max_items', '10')");

  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys=ON;');
  console.log('Migration successful: Extended guest_orders schema and added QR settings.');
} catch (e) {
  try { db.exec('ROLLBACK;'); } catch {}
  console.error('Migration failed:', e.message);
}
