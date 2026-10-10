// ==========================================
// PHASE 2
// ==========================================

// ------------------------------------------
// File: server/services/registrationService.js
// ------------------------------------------
const db = require('../db/database');

const registrationService = {
  /**
   * Generates a unique registration number based on the Phase 1 spec.
   */
  generateRegNumber: (firstName, surname, grade) => {
    const f = firstName.charAt(0).toUpperCase();
    const s = surname.charAt(0).toUpperCase();
    let base = '';

    if (grade === 'ECD A') {
      base = `${f}ECDA${s}`;
    } else if (grade === 'ECD B') {
      base = `${f}ECDB${s}`;
    } else if (grade.startsWith('Grade')) {
      const num = grade.split(' ')[1];
      base = `${f}GRD${num}${s}`;
    } else if (grade.startsWith('Form')) {
      const num = grade.split(' ')[1];
      base = `${f}FRM${num}${s}`;
    }

    let current = base;
    let counter = 1;

    // Loop until we find a unique registration number
    while (true) {
      const exists = db.prepare('SELECT registration_number FROM students WHERE registration_number = ?').get(current);
      if (!exists) return current;
      
      current = `${base}${counter}`;
      counter++;
    }
  },

  /**
   * Maps a grade to its database category code.
   */
  getGradeCategory: (grade) => {
    if (['ECD A', 'ECD B', 'Grade 1', 'Grade 2'].includes(grade)) return 'ecd-grade2';
    if (['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(grade)) return 'grade3-7';
    if (['Form 1', 'Form 2', 'Form 3', 'Form 4'].includes(grade)) return 'form1-4';
    if (['Form 5', 'Form 6'].includes(grade)) return 'form5-6';
    return 'unknown';
  },

  /**
   * Builds standardized initials (e.g., "I.C." or "I.M.C.")
   */
  buildInitials: (firstName, secondName, surname) => {
    let initials = `${firstName.charAt(0).toUpperCase()}.`;
    if (secondName && secondName.trim() !== '') {
      initials += `${secondName.charAt(0).toUpperCase()}.`;
    }
    initials += `${surname.charAt(0).toUpperCase()}.`;
    return initials;
  },

  /**
   * Determines the next grade for annual batch promotions.
   */
  getNextGrade: (currentGrade) => {
    const promotionMap = {
      'ECD A': 'ECD B',
      'ECD B': 'Grade 1',
      'Grade 1': 'Grade 2',
      'Grade 2': 'Grade 3',
      'Grade 3': 'Grade 4',
      'Grade 4': 'Grade 5',
      'Grade 5': 'Grade 6',
      'Grade 6': 'Grade 7',
      'Grade 7': 'Form 1',
      'Form 1': 'Form 2',
      'Form 2': 'Form 3',
      'Form 3': 'Form 4',
      'Form 4': 'Form 5',
      'Form 5': 'Form 6',
      'Form 6': 'graduated'
    };
    return promotionMap[currentGrade] || null;
  }
};

module.exports = registrationService;


// ------------------------------------------
// File: server/services/receiptService.js
// ------------------------------------------
// Note: Requires db to be imported if split into its own file
const receiptService = {
  /**
   * Zero-pads the receipt number to 4 digits.
   */
  formatReceipt: (number) => {
    return number.toString().padStart(4, '0');
  },

  /**
   * Increments and fetches the next available global receipt number.
   */
  getNextReceipt: () => {
    const stmt = db.prepare(`
      UPDATE receipt_sequence 
      SET last_receipt_number = last_receipt_number + 1, 
          last_updated_at = datetime('now') 
      WHERE id = 1 
      RETURNING last_receipt_number
    `);
    const row = stmt.get();
    return { 
      raw: row.last_receipt_number, 
      formatted: receiptService.formatReceipt(row.last_receipt_number) 
    };
  },

  /**
   * Analyzes manual user input to detect skipped or spoiled receipts.
   */
  detectGap: (actualNumber) => {
    const row = db.prepare('SELECT last_receipt_number FROM receipt_sequence WHERE id = 1').get();
    const expected = row.last_receipt_number + 1;
    const gap = actualNumber - expected;

    let alertLevel = 'normal';
    if (gap === 1) alertLevel = 'normal'; // Next sequential input
    else if (gap === 2 || gap === 3) alertLevel = 'warning'; // 1-2 receipts spoiled
    else if (gap >= 4) alertLevel = 'high_alert'; // Critical

    return { expected, actual: actualNumber, gap, alertLevel };
  },

  /**
   * Logs identified gaps for security and auditing.
   */
  logGap: (expected, actual, gap, alertLevel, reason = null) => {
    const stmt = db.prepare(`
      INSERT INTO receipt_log (expected_receipt_number, actual_receipt_number, gap, alert_level, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(expected, actual, gap, alertLevel, reason);
    
    // Invalidate sync flag for Supabase
    db.prepare(`UPDATE sync_log SET synced_at = NULL WHERE table_name = 'receipt_log'`).run(); 
  }
};

module.exports = receiptService;


// ------------------------------------------
// File: server/routes/students.js
// ------------------------------------------
const express = require('express');
const router = express.Router();
// const db = require('../db/database'); // Uncomment when splitting
// const { generateRegNumber, buildInitials, getGradeCategory } = require('../services/registrationService'); // Uncomment when splitting

// GET /api/students - List students (with filters)
router.get('/', (req, res) => {
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
  const { q } = req.query;
  if (!q) return res.json([]);

  const searchTerm = `%${q}%`;
  const stmt = db.prepare(`
    SELECT * FROM students 
    WHERE first_name LIKE ? OR surname LIKE ? OR registration_number LIKE ?
    ORDER BY surname ASC LIMIT 10
  `);
  
  try {
    const results = stmt.all(searchTerm, searchTerm, searchTerm);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:regNumber
router.get('/:regNumber', (req, res) => {
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
  try {
    db.prepare(`UPDATE students SET status = 'transferred', synced_at = NULL WHERE registration_number = ?`).run(req.params.regNumber);
    res.json({ success: true, message: 'Student marked as transferred' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/students/:regNumber/recover
router.patch('/:regNumber/recover', (req, res) => {
  try {
    db.prepare(`UPDATE students SET status = 'active', synced_at = NULL WHERE registration_number = ?`).run(req.params.regNumber);
    res.json({ success: true, message: 'Student recovered to active status' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students/bulk-action
router.post('/bulk-action', (req, res) => {
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

module.exports = router;