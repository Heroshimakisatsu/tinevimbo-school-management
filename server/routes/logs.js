const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, entity_type, payment_type, changed_by, previous_value, new_value, reason, details, created_at
      FROM logs
      ORDER BY created_at DESC
    `).all();

    res.json(rows);
  } catch (error) {
    console.error('[Logs] Failed to read log entries:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/receipt-change', (req, res) => {
  try {
    const db = getDb();
    const { payment_type, changed_by, previous_value, new_value, reason, details } = req.body || {};

    if (!payment_type) {
      return res.status(400).json({ error: 'payment_type is required' });
    }

    if (!new_value && new_value !== 0) {
      return res.status(400).json({ error: 'new_value is required' });
    }

    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) {
      return res.status(400).json({ error: 'A reason is required before saving a receipt-change log.' });
    }

    const result = db.prepare(`
      INSERT INTO logs (
        entity_type,
        payment_type,
        changed_by,
        previous_value,
        new_value,
        reason,
        details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'receipt_number',
      String(payment_type),
      (changed_by || 'Current User').toString(),
      previous_value !== undefined && previous_value !== null ? String(previous_value) : null,
      String(new_value),
      trimmedReason,
      details ? String(details) : null
    );

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Receipt change log saved successfully.'
    });
  } catch (error) {
    console.error('[Logs] Failed to save receipt-change log:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
