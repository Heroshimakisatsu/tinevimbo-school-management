// server/index.js
// Express entry point for Tinevimbo School Management System backend
// Runs on port 3001 alongside the React frontend on port 5173

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const { initDb } = require('./db/database');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:4173',  // Vite preview
    'http://localhost:3000',  // fallback
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    service:   'Tinevimbo School Management System API',
    version:   '1.0.0',
  });
});

// ── Routes — registered after DB is ready ────────────────────
// Routes will be added here as each phase is built:
//
// Phase 2: const studentsRouter  = require('./routes/students');
// Phase 3: const intakeRouter    = require('./routes/intake');
// Phase 4: const paymentsRouter  = require('./routes/payments');
//          const termFeesRouter  = require('./routes/termFees');
// Phase 5: const expensesRouter  = require('./routes/expenses');
// Phase 6: const uniformsRouter  = require('./routes/uniformInventory');
// Phase 7: const inventoryRouter = require('./routes/schoolInventory');
// Phase 8: const dashboardRouter = require('./routes/dashboard');
//          const tracerRouter    = require('./routes/tracer');
// Phase 9: const syncRouter      = require('./routes/sync');
//
// app.use('/api/students',  studentsRouter);
// app.use('/api/intake',    intakeRouter);
// ... etc.

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error:   'Not Found',
    message: `Route ${req.method} ${req.url} does not exist`,
  });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error:   'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// ── Start server ──────────────────────────────────────────────
const startServer = () => {
  try {
    // Initialise SQLite — runs schema, views, triggers, seed
    initDb();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║  Tinevimbo School Management System          ║');
      console.log('║  Backend API running                         ║');
      console.log(`║  http://localhost:${PORT}                        ║`);
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
    });

  } catch (err) {
    console.error('[Fatal] Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
