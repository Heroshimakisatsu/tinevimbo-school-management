// server/routes/expenseTypes.js
// Expense type management routes

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/expense-types - Master list
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const types = db.prepare('SELECT * FROM expense_types ORDER BY name ASC').all();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/expense-types - Add new type
router.post('/', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    db.prepare('INSERT INTO expense_types (name) VALUES (?)').run(name);
    res.status(201).json({ success: true, message: 'Expense type added' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Expense type already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/expense-types/:id - Toggle active/inactive
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { is_active } = req.body;
  if (typeof is_active !== 'number') {
    return res.status(400).json({ error: 'is_active must be a number (0 or 1)' });
  }

  try {
    const result = db.prepare('UPDATE expense_types SET is_active = ? WHERE id = ?').run(is_active, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Expense type not found' });
    
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
