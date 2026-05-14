const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true })); // Allow any origin for local network access
app.use(express.json({ limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/refunds',   require('./routes/refunds'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/guest',     require('./routes/guest'));
app.use('/api/orders',    require('./routes/orders'));

// ─── Health & Info ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/info/ip', (req, res) => {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ name, address: net.address });
      }
    }
  }
  res.json({ 
    ip: addresses.length > 0 ? addresses[0].address : 'localhost',
    all: addresses 
  });
});

// ─── Serve React frontend in production ──────────────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // All non-API routes serve the React app
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 HCMS ${isProd ? 'Production' : 'Backend'} running at http://localhost:${PORT}`);
  });
}

module.exports = app;
