// server/routes/students.js
// Student CRUD + transfer/recover/bulk operations

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const registrationService = require('../services/registrationService');

// GET /api/students - List students (with filters)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, view, incomplete } = req.query;
  let query = 'SELECT * FROM students WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (view === 'primary') {
    query += " AND (grade LIKE 'ECD%' OR grade LIKE 'Grade%')";
  } else if (view === 'secondary') {
    query += " AND grade LIKE 'Form%'";
  }

  // Handle incomplete payments filter via the view
  if (incomplete === 'true') {
    query = `
      SELECT s.*, v.expected, v.paid, v.debt, v.percent_paid 
      FROM students s 
      JOIN incomplete_payments_current_month v ON s.registration_number = v.registration_number
      WHERE s.status = 'active'
    `;
    if (view === 'primary') query += " AND (s.grade LIKE 'ECD%' OR s.grade LIKE 'Grade%')";
    if (view === 'secondary') query += " AND s.grade LIKE 'Form%'";
  }

  query += ' ORDER BY surname ASC, first_name ASC';
  
  try {
    const students = db.prepare(query).all(...params);
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/search?q=
router.get('/search', (req, res) => {
  const db = getDb();
  const { q } = req.query;
  if (!q || String(q).trim() === '') return res.json([]);

  const query = String(q).trim();
  const searchTerm = `%${query}%`;
  const lowercaseTerm = `%${query.toLowerCase()}%`;

  const stmt = db.prepare(`
    SELECT * FROM students 
    WHERE 
      LOWER(first_name) LIKE LOWER(?) OR
      LOWER(surname) LIKE LOWER(?) OR
      LOWER(first_name || ' ' || surname) LIKE LOWER(?) OR
      LOWER(registration_number) LIKE LOWER(?)
    ORDER BY surname ASC LIMIT 10
  `);

  try {
    const results = stmt.all(searchTerm, searchTerm, searchTerm, searchTerm);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/transactions - Recent transactions globally
router.get('/transactions', (req, res) => {
  const db = getDb();
  try {
    const transactions = db.prepare(`
      SELECT t.*, s.first_name || ' ' || s.surname as studentName, s.grade as studentGrade
      FROM transactions t
      LEFT JOIN students s ON t.registration_number = s.registration_number
      ORDER BY t.date DESC, t.id DESC
      LIMIT 100
    `).all();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber
router.get('/:regNumber', (req, res) => {
  const db = getDb();
  try {
    const student = db.prepare('SELECT * FROM students WHERE registration_number = ?').get(req.params.regNumber);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students (Internal / Direct Create)
router.post('/', (req, res) => {
  const db = getDb();
  const { 
    first_name, second_name, surname, grade, gender, 
    registration_fee_paid, registration_fee_amount, 
    parent_phone_number, parent_has_whatsapp, whatsapp_contact_name,
    academic_year, is_transfer, transfer_date 
  } = req.body;

  const registration_number = registrationService.generateRegNumber(first_name, surname, grade);
  const initials = registrationService.buildInitials(first_name, second_name, surname);
  const grade_code = registrationService.getGradeCategory(grade);

  try {
    const stmt = db.prepare(`
      INSERT INTO students (
        registration_number, first_name, second_name, surname, initials, 
        grade, grade_code, gender, registration_fee_paid, registration_fee_amount, 
        registration_date, is_transfer, transfer_date, parent_phone_number, 
        parent_has_whatsapp, whatsapp_contact_name, academic_year, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, NULL)
    `);

    stmt.run(
      registration_number, first_name, second_name, surname, initials,
      grade, grade_code, gender, registration_fee_paid, registration_fee_amount,
      is_transfer || 0, transfer_date || null, parent_phone_number,
      parent_has_whatsapp || 0, whatsapp_contact_name, academic_year
    );

    res.status(201).json({ success: true, registration_number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/students/:regNumber (Update Details)
router.patch('/:regNumber', (req, res) => {
  const db = getDb();
  const { regNumber } = req.params;
  const updates = req.body;
  
  // Prevent updating primary key or status directly via this route
  delete updates.registration_number; 
  delete updates.status;

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  updates.synced_at = null; // Mark for Supabase sync
  
  const setString = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), regNumber];

  try {
    db.prepare(`UPDATE students SET ${setString} WHERE registration_number = ?`).run(...values);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/students/:regNumber/transfer
router.patch('/:regNumber/transfer', (req, res) => {
  const db = getDb();
  try {
    db.prepare(`UPDATE students SET status = 'transferred', synced_at = NULL WHERE registration_number = ?`).run(req.params.regNumber);
    res.json({ success: true, message: 'Student marked as transferred' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/students/:regNumber/recover
router.patch('/:regNumber/recover', (req, res) => {
  const db = getDb();
  try {
    db.prepare(`UPDATE students SET status = 'active', synced_at = NULL WHERE registration_number = ?`).run(req.params.regNumber);
    res.json({ success: true, message: 'Student recovered to active status' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students/bulk-action
router.post('/bulk-action', (req, res) => {
  const db = getDb();
  const { action, regNumbers } = req.body;
  if (!Array.isArray(regNumbers) || regNumbers.length === 0) return res.status(400).json({ error: 'Invalid payload' });

  try {
    const runBulk = db.transaction((numbers) => {
      if (action === 'transfer') {
        const stmt = db.prepare(`UPDATE students SET status = 'transferred', synced_at = NULL WHERE registration_number = ?`);
        numbers.forEach(num => stmt.run(num));
      }
    });

    runBulk(regNumbers);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber/payment-summary
router.get('/:regNumber/payment-summary', (req, res) => {
  const db = getDb();
  const { term, academic_year } = req.query;
  
  if (!term || !academic_year) {
    return res.status(400).json({ error: 'term and academic_year query parameters are required' });
  }

  try {
    const paymentService = require('../services/paymentService');
    const summary = paymentService.getOutstanding(req.params.regNumber, term, academic_year);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber/financial-profile
router.get('/:regNumber/financial-profile', (req, res) => {
  const db = getDb();
  try {
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
