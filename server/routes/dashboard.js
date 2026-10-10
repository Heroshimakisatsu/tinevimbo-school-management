// server/routes/dashboard.js
// Dashboard aggregation endpoints for summary cards and charts

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/dashboard/overview - Top-level metrics for the main cards
router.get('/overview', (req, res) => {
  const db = getDb();
  try {
    // 1. Total Active Students
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'active'").get().count;
    
    // 2. Uniform Stock Alerts
    const uniformAlerts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM uniform_stock_totals 
      WHERE stock_status IN ('low-stock', 'out-of-stock')
    `).get().count;

    // 3. School Inventory Alerts
    const inventoryAlerts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM school_inventory 
      WHERE status IN ('low-stock', 'out-of-stock')
    `).get().count;

    // 4. Current Month Revenue (Transactions)
    const monthlyRevenue = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get().total || 0;

    // 5. Current Month Expenses
    const monthlyExpenses = db.prepare(`
      SELECT SUM(amount) as total 
      FROM expenses 
      WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
    `).get().total || 0;

    res.json({
      active_students: studentCount,
      uniform_alerts: uniformAlerts,
      inventory_alerts: inventoryAlerts,
      monthly_revenue: monthlyRevenue,
      monthly_expenses: monthlyExpenses,
      net_balance: monthlyRevenue - monthlyExpenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/recent-activity - Feed for a recent activity widget
router.get('/recent-activity', (req, res) => {
  const db = getDb();
  try {
    // Fetch the 10 most recent transactions across the school
    const recentTransactions = db.prepare(`
      SELECT t.*, s.first_name, s.surname, s.grade
      FROM transactions t
      LEFT JOIN students s ON t.registration_number = s.registration_number
      ORDER BY t.date DESC, t.id DESC 
      LIMIT 10
    `).all();
    
    res.json(recentTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/stats - KPI stats from view
router.get('/stats', (req, res) => {
  const db = getDb();
  try {
    const stats = db.prepare('SELECT * FROM dashboard_stats').get();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/student-statistics - Breakdown from view
router.get('/student-statistics', (req, res) => {
  const db = getDb();
  try {
    const stats = db.prepare('SELECT * FROM student_statistics').all();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/grade-distribution - Grade breakdown from view
router.get('/grade-distribution', (req, res) => {
  const db = getDb();
  try {
    const dist = db.prepare('SELECT * FROM grade_distribution').all();
    res.json(dist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/weekly-financials - Last 7 days income vs expenses
router.get('/weekly-financials', (req, res) => {
  const db = getDb();
  try {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const dailyData = dates.map(date => {
      const income = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ?").get(date).total;
      const expense = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?").get(date).total;
      return { date, income, expense };
    });

    res.json(dailyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/daily-fee-breakdown?date=YYYY-MM-DD
router.get('/daily-fee-breakdown', (req, res) => {
  const db = getDb();
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const transactionsOnDate = db.prepare(`
      SELECT t.*, s.grade 
      FROM transactions t
      LEFT JOIN students s ON t.registration_number = s.registration_number
      WHERE t.date = ?
    `).all(date);
    // Split totals by primary vs secondary and by type
    let primaryFees = 0;         // tuition / registration / relish for primary grades
    let secondaryFees = 0;       // tuition / registration for secondary grades
    let primaryTransport = 0;
    let secondaryTransport = 0;
    let primaryUniform = 0;
    let secondaryUniform = 0;

    transactionsOnDate.forEach(t => {
      const isPrimary = t.grade ? (t.grade.includes('ECD') || t.grade.includes('Grade 1') || t.grade.includes('Grade 2')) : false;

      if (t.type === 'transport') {
        if (isPrimary) primaryTransport += t.amount;
        else secondaryTransport += t.amount;
      } else if (t.type === 'uniform') {
        if (isPrimary) primaryUniform += t.amount;
        else secondaryUniform += t.amount;
      } else {
        // All other payment types (tuition, relish, other) are counted under fees
        if (isPrimary) primaryFees += t.amount;
        else secondaryFees += t.amount;
      }
    });

    const totalExpenses = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?").get(date).total;

    const totalIncome = primaryFees + secondaryFees + primaryTransport + secondaryTransport + primaryUniform + secondaryUniform;
    const profit = totalIncome - totalExpenses;

    res.json({
      date,
      primaryFees,
      primaryTransport,
      primaryUniform,
      secondaryFees,
      secondaryTransport,
      secondaryUniform,
      totalExpenses,
      totalIncome,
      profit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
