// server/routes/tracer.js
// Tracer endpoints for student lifecycle tracking and financial auditing

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/tracer/student-lifecycle
// Tracks non-active students (transfers, dropouts) for reporting
router.get('/student-lifecycle', (req, res) => {
  const db = getDb();
  const { status, academic_year } = req.query;
  
  let query = `
    SELECT registration_number, first_name, surname, grade, status, transfer_date, academic_year 
    FROM students 
    WHERE status != 'active'
  `;
  const params = [];
  
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (academic_year) {
    query += " AND academic_year = ?";
    params.push(academic_year);
  }
  
  query += " ORDER BY transfer_date DESC, surname ASC";

  try {
    const records = db.prepare(query).all(...params);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tracer/receipt-gaps
// Exposes the receipt_log table created in Phase 2 for financial auditing
router.get('/receipt-gaps', (req, res) => {
  const db = getDb();
  const { alert_level } = req.query;

  let query = "SELECT * FROM receipt_log";
  const params = [];

  if (alert_level) {
    query += " WHERE alert_level = ?";
    params.push(alert_level);
  }

  query += " ORDER BY created_at DESC";

  try {
    const gaps = db.prepare(query).all(...params);
    res.json(gaps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tracer/summary
router.get('/summary', (req, res) => {
  const db = getDb();
  try {
    const summary = db.prepare('SELECT * FROM tracer_summary').get();
    const incompleteCount = db.prepare("SELECT COUNT(*) as count FROM incomplete_payments_current_month").get().count;
    res.json({
      ...summary,
      incomplete_payments: incompleteCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
