// server/routes/termFees.js
// Term fee structure management routes

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/term-fees
router.get('/', (req, res) => {
  const db = getDb();
  const { academic_year, term, grade } = req.query;
  let query = 'SELECT * FROM term_fees WHERE 1=1';
  const params = [];

  if (academic_year) { query += ' AND academic_year = ?'; params.push(academic_year); }
  if (term) { query += ' AND term = ?'; params.push(term); }
  if (grade) { query += ' AND grade = ?'; params.push(grade); }

  query += ' ORDER BY academic_year DESC, term DESC, grade ASC';

  try {
    const fees = db.prepare(query).all(...params);
    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/term-fees
router.post('/', (req, res) => {
  const db = getDb();
  const { academic_year, term, grade, tuition_fee, transport_fee, relish_fee } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO term_fees (
        academic_year, term, grade, tuition_fee, transport_fee, relish_fee, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `);

    stmt.run(
      academic_year, term, grade, 
      tuition_fee || 0, 
      transport_fee || null, 
      relish_fee || null
    );

    res.status(201).json({ success: true, message: 'Term fee structure created' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Fee structure already exists for this year/term/grade' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/term-fees/:id
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const updates = req.body;
  
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields provided to update' });

  updates.synced_at = null; // Mark for Supabase sync
  
  const setString = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    const result = db.prepare(`UPDATE term_fees SET ${setString} WHERE id = ?`).run(...values);
    if (result.changes === 0) return res.status(404).json({ error: 'Term fee record not found' });
    
    res.json({ success: true, message: 'Term fee structure updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
