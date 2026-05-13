# ☕ Hotel Café Management System (HCMS)

A full-stack, production-ready web application for managing a hotel café — POS, inventory, reporting, and multi-user access.

---

## 🚀 Quick Start

```bash
# 1. Install all dependencies (run once)
cd hcms
npm run install:all

# 2. Seed the database (run once)
npm run seed

# 3. Start the app (backend + frontend together)
npm run dev
```

Then open → **http://localhost:5173**

---

## 🔑 Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | `admin`  | `admin123` |
| Staff | `staff`  | `staff123` |

> ⚠️ Change these before deploying to production!

---

## 🏗️ Stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React + Vite            |
| Backend  | Node.js + Express       |
| Database | SQLite (better-sqlite3) |
| Auth     | JWT (12h expiry)        |
| Charts   | Recharts                |
| Export   | SheetJS (Excel)         |

---

## 📁 Project Structure

```
hcms/
├── package.json          ← root (concurrently)
├── backend/
│   ├── server.js         ← Express API (port 3001)
│   ├── db.js             ← SQLite schema
│   ├── seed.js           ← sample data
│   ├── middleware.js      ← JWT auth
│   └── routes/           ← auth, products, sales, refunds, reports...
└── frontend/
    ├── vite.config.js    ← proxies /api → port 3001
    └── src/
        ├── pages/        ← Dashboard, POS, Inventory, Reports...
        └── components/   ← Sidebar, TopBar, LowStockBanner...
```

---

## ✨ Features

- **POS** — Fast product grid, add to cart, room number (required), payment method, auto 15% VAT
- **Inventory** — Full CRUD, expiry tracking, low stock indicators
- **Dashboard** — KPI cards, sales charts, top sellers
- **Reports** — Daily / Monthly / Inventory / Profit with Excel export
- **Room Consumption** — Search any room to see all orders
- **Refunds** — Invoice lookup → restore stock → log reason
- **Invoices** — Printable A4 invoice with all details
- **Users** — Admin manages staff accounts (RBAC)
- **Low Stock Banner** — Sticky warning bar for items below minimum

---

## 🔌 API Endpoints

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| POST   | /api/auth/login             | Login                |
| GET    | /api/products               | List products        |
| POST   | /api/sales                  | Create sale          |
| GET    | /api/sales/:id              | Sale details         |
| POST   | /api/refunds                | Process refund       |
| GET    | /api/reports/daily          | Daily report         |
| GET    | /api/reports/monthly        | Monthly report       |
| GET    | /api/reports/inventory      | Inventory report     |
| GET    | /api/reports/room/:room     | Room consumption     |
| GET    | /api/reports/profit         | Profit report        |

---

## 📦 Database

SQLite file: `backend/hcms.db` (auto-created on first run)

Tables: `users`, `products`, `sales`, `sale_items`, `refunds`, `suppliers`, `customers`, `invoice_counters`

---

## 🖨️ Invoice Format

- Hotel name, invoice number, date/time
- Product details, quantity, unit price
- Subtotal + 15% VAT + Total
- Room number + payment method
- Cashier name
- Optimized for A4 printing via browser print dialog
