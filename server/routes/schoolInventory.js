// server/routes/schoolInventory.js
// School inventory management routes

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/inventory/stats - Aggregate stats for header cards
router.get('/stats', (req, res) => {
  const db = getDb();
  try {
    const stats = db.prepare('SELECT * FROM school_inventory_stats').get();
    res.json(stats || { total_items: 0, total_value: 0, low_stock: 0, out_of_stock: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventory - All items (with optional filters)
router.get('/', (req, res) => {
  const db = getDb();
  const { q, category, location } = req.query;
  
  let query = 'SELECT * FROM school_inventory WHERE 1=1';
  const params = [];

  if (q) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (location) {
    query += ' AND location = ?';
    params.push(location);
  }

  query += ' ORDER BY name ASC';

  try {
    const items = db.prepare(query).all(...params);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inventory - Add new inventory item
router.post('/', (req, res) => {
  const db = getDb();
  const { 
    name, description, category, quantity, min_stock, max_stock, 
    unit, unit_cost, location, supplier, last_restocked 
  } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO school_inventory (
        name, description, category, quantity, min_stock, max_stock, 
        unit, unit_cost, location, supplier, last_restocked, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    const result = stmt.run(
      name, description || null, category, 
      quantity || 0, min_stock || 0, max_stock || 0, 
      unit, unit_cost || 0, location, 
      supplier || null, last_restocked || null
    );

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/inventory/:id - Edit item (Triggers auto-update 'status')
router.patch('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const updates = req.body;

  // Prevent direct status updates since triggers handle it
  delete updates.status;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update' });
  }

  updates.synced_at = null; // Mark for Supabase sync
  
  const setString = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    const result = db.prepare(`UPDATE school_inventory SET ${setString} WHERE id = ?`).run(...values);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
    
    res.json({ success: true, message: 'Inventory item updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inventory/:id - Delete item
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM school_inventory WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
    
    res.json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
