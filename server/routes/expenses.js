// server/routes/expenses.js
// Expense tracking with predictive quick cards

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/expenses - All expenses
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC').all();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/expenses/summary - Totals by category (current month)
router.get('/summary', (req, res) => {
  const db = getDb();
  try {
    const summary = db.prepare(`
      SELECT expense_type, SUM(amount) as total
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
      GROUP BY expense_type
      ORDER BY total DESC
    `).all();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/expenses/quick-cards?day=0-6 - Predictive cards ordered by frequency
router.get('/quick-cards', (req, res) => {
  const db = getDb();
  const { day } = req.query;
  
  // Default to today's day of week (0-6, Sunday-Saturday) if not provided
  const dayOfWeek = day !== undefined ? parseInt(day, 10) : new Date().getDay();

  try {
    const cards = db.prepare(`
      SELECT expense_type, last_amount, count
      FROM expense_type_frequency
      WHERE day_of_week = ?
      ORDER BY count DESC, expense_type ASC
      LIMIT 8
    `).all(dayOfWeek);
    
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/expenses/bulk - Submit entire cart at once & update predictive frequencies
router.post('/bulk', (req, res) => {
  const db = getDb();
  const { expenses } = req.body;
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return res.status(400).json({ error: 'Expenses array is required' });
  }

  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const dateString = today.toISOString().split('T')[0];

    const processExpenses = db.transaction((items) => {
      const insertExpenseStmt = db.prepare(`
        INSERT INTO expenses (expense_type, description, amount, date, synced_at)
        VALUES (?, ?, ?, ?, NULL)
      `);

      const upsertFreqStmt = db.prepare(`
        INSERT INTO expense_type_frequency (expense_type, day_of_week, count, last_amount, last_used_date)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(expense_type, day_of_week) DO UPDATE SET
          count = count + 1,
          last_amount = excluded.last_amount,
          last_used_date = excluded.last_used_date,
          updated_at = datetime('now')
      `);

      for (const item of items) {
        // 1. Insert the actual expense log
        insertExpenseStmt.run(
          item.expense_type,
          item.description || null,
          item.amount,
          dateString
        );

        // 2. Update the predictive frequency table
        upsertFreqStmt.run(
          item.expense_type,
          dayOfWeek,
          item.amount,
          dateString
        );
      }
    });

    processExpenses(expenses);
    res.status(201).json({ success: true, message: 'Expenses recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
