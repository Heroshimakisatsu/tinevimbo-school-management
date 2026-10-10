// server/routes/payments.js
// Payment transaction routes for students

const express = require('express');
const router = express.Router({ mergeParams: true }); // Enables accessing :regNumber from parent router if nested
const { getDb } = require('../db/database');
const paymentService = require('../services/paymentService');
const intakeRouter = require('./intake');

// GET /api/students/:regNumber/transactions
router.get('/', (req, res) => {
  try {
    const history = paymentService.getHistory(req.params.regNumber);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students/:regNumber/transactions
router.post('/', (req, res) => {
  const { regNumber } = req.params;
  const { payments } = req.body;

  if (!Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'Payments array is required' });
  }

  try {
    const db = getDb();
    const student = db.prepare('SELECT grade, grade_code FROM students WHERE registration_number = ?').get(regNumber);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const results = intakeRouter.recordStudentPaymentBatch(regNumber, payments, student.grade, student.grade_code);
    res.status(201).json({ success: true, processed: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber/payment-summary
router.get('/payment-summary', (req, res) => {
  const { term, academic_year } = req.query;
  
  if (!term || !academic_year) {
    return res.status(400).json({ error: 'term and academic_year query parameters are required' });
  }

  try {
    const summary = paymentService.getOutstanding(req.params.regNumber, term, academic_year);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber/financial-profile
router.get('/financial-profile', (req, res) => {
  try {
    const db = getDb();
    // Queries the view created in Phase 1
    const profile = db.prepare(`
      SELECT * FROM student_monthly_financial 
      WHERE registration_number = ? 
      ORDER BY month DESC
    `).all(req.params.regNumber);
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
