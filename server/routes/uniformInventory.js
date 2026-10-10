// server/routes/uniformInventory.js
// Uniform inventory CRUD — manages uniform items and their stock status

const express        = require('express');
const router         = express.Router();
const { getDb }      = require('../db/database');
const uniformService = require('../services/uniformService');

// ── Helper: fetch sizes for a uniform ─────────────────────
const getSizesForUniform = (db, uniformId) => {
  return db.prepare(`
    SELECT id, size_label, quantity, synced_at, created_at, updated_at
    FROM uniform_sizes
    WHERE uniform_id = ?
    ORDER BY size_label
  `).all(uniformId);
};

// ══════════════════════════════════════════════════════════════
// GET /api/uniforms/stats
// Aggregate stock totals — used by Dashboard and Uniform page header
// ══════════════════════════════════════════════════════════════
router.get('/stats', (req, res) => {
  const db = getDb();

  const stats = db.prepare(`
    SELECT
      COUNT(id)                                                      AS total_items,
      SUM(CASE WHEN stock_status = 'low-stock'    THEN 1 ELSE 0 END) AS low_stock_items,
      SUM(CASE WHEN stock_status = 'out-of-stock' THEN 1 ELSE 0 END) AS out_of_stock_items,
      COALESCE(SUM(total_stock), 0)                                  AS total_units_in_stock
    FROM uniform_stock_totals
  `).get();

  res.json({ data: stats });
});

// ══════════════════════════════════════════════════════════════
// GET /api/uniforms/inventory-summary
// Returns uniform inventory grouped by category with remaining/initial quantities
// Used by Dashboard to show uniform stock status table
// ══════════════════════════════════════════════════════════════
router.get('/inventory-summary', (req, res) => {
  const db = getDb();

  const categoryOrder = ['ecd-grade2', 'grade3-7', 'form1-4', 'form5-6'];
  const categoryNames = {
    'ecd-grade2': 'ECD → Grade 2',
    'grade3-7': 'Grade 3 → 7',
    'form1-4': 'Form 1 → Form 4',
    'form5-6': 'Form 5 → Form 6'
  };

  const summary = categoryOrder.map(category => {
    const uniforms = db.prepare(`
      SELECT
        ui.name,
        ui.category,
        COALESCE(SUM(us.quantity), 0) AS remaining_quantity
      FROM uniform_inventory ui
      LEFT JOIN uniform_sizes us ON us.uniform_id = ui.id
      WHERE ui.category = ?
      GROUP BY ui.id, ui.name, ui.category
      ORDER BY ui.name
    `).all(category);

    return {
      category,
      category_name: categoryNames[category],
      uniforms: uniforms.map(u => ({
        name: u.name,
        remaining: u.remaining_quantity,
        display: `${u.remaining_quantity}`
      }))
    };
  });

  res.json({ data: summary });
});

// ══════════════════════════════════════════════════════════════
// GET /api/uniforms
// All uniforms with optional filters
// Query params:
//   ?category=ecd-grade2|grade3-7|form1-4|form5-6
//   ?gender=male|female|unisex
//   ?grade=Grade 5&gender=male  → uses card-filtering service
// ══════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const db = getDb();
  const { category, gender, grade } = req.query;

  // ── Card filtering mode (used by Intake and Finance) ──────
  if (grade && gender) {
    try {
      const cards = uniformService.getCardsByGradeGender(grade, gender);
      return res.json({ data: cards, count: cards.length });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // ── General listing mode ──────────────────────────────────
  let sql    = `
    SELECT u.*,
           v.total_stock,
           v.stock_status
    FROM uniform_inventory u
    LEFT JOIN uniform_stock_totals v ON u.id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (category) {
    sql += ' AND u.category = ?';
    params.push(category);
  }

  if (gender) {
    sql += " AND u.applicable_gender IN (?, 'unisex')";
    params.push(gender);
  }

  sql += ' ORDER BY u.category, u.name';

  const items = db.prepare(sql).all(...params);

  // Attach sizes array to each item
  const enriched = items.map(item => ({
    ...item,
    sizes: getSizesForUniform(db, item.id),
  }));

  res.json({ data: enriched, count: enriched.length });
});

// ══════════════════════════════════════════════════════════════
// GET /api/uniforms/:id
// Single uniform with its sizes
// Used by Finance when looking up a specific uniform item
// ══════════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  const db      = getDb();
  const uniform = db.prepare(`
    SELECT u.*,
           v.total_stock,
           v.stock_status
    FROM uniform_inventory u
    LEFT JOIN uniform_stock_totals v ON u.id = v.id
    WHERE u.id = ?
  `).get(req.params.id);

  if (!uniform) {
    return res.status(404).json({ error: 'Uniform not found' });
  }

  uniform.sizes = getSizesForUniform(db, uniform.id);
  res.json({ data: uniform });
});

// ══════════════════════════════════════════════════════════════
// POST /api/uniforms
// Add a new uniform item
// ══════════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const db = getDb();
  const {
    name,
    category,
    applicable_gender = 'unisex',
    price             = 0,
    color             = null,
    description       = null,
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'name and category are required' });
  }

  const validCategories = ['ecd-grade2', 'grade3-7', 'form1-4', 'form5-6'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error:  'Invalid category',
      valid:  validCategories,
    });
  }

  const result = db.prepare(`
    INSERT INTO uniform_inventory
      (name, category, applicable_gender, price, color, description, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL)
  `).run(name, category, applicable_gender, price, color, description);

  const created = db.prepare(`
    SELECT * FROM uniform_inventory WHERE id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ data: { ...created, sizes: [] } });
});

// ══════════════════════════════════════════════════════════════
// PATCH /api/uniforms/:id
// Update uniform details (price, colour, name, description)
// ══════════════════════════════════════════════════════════════
router.patch('/:id', (req, res) => {
  const db      = getDb();
  const allowed = ['name', 'category', 'price', 'color', 'description', 'applicable_gender'];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided to update' });
  }

  const uniform = db.prepare(`
    SELECT id FROM uniform_inventory WHERE id = ?
  `).get(req.params.id);

  if (!uniform) {
    return res.status(404).json({ error: 'Uniform not found' });
  }

  // Build SET clause dynamically from allowed fields only
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values    = [...Object.values(updates), req.params.id];

  db.prepare(`
    UPDATE uniform_inventory
    SET ${setClause}, synced_at = NULL
    WHERE id = ?
  `).run(...values);

  const updated = db.prepare(`
    SELECT u.*, v.total_stock, v.stock_status
    FROM uniform_inventory u
    LEFT JOIN uniform_stock_totals v ON u.id = v.id
    WHERE u.id = ?
  `).get(req.params.id);

  updated.sizes = getSizesForUniform(db, updated.id);
  res.json({ data: updated });
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/uniforms/:id
// Delete uniform — cascade to sizes handled by SQLite FK
// ══════════════════════════════════════════════════════════════
router.delete('/:id', (req, res) => {
  const db      = getDb();
  const uniform = db.prepare(`
    SELECT id, name FROM uniform_inventory WHERE id = ?
  `).get(req.params.id);

  if (!uniform) {
    return res.status(404).json({ error: 'Uniform not found' });
  }

  db.prepare('DELETE FROM uniform_inventory WHERE id = ?').run(req.params.id);

  res.json({
    message: `Uniform "${uniform.name}" deleted successfully`,
  });
});

module.exports = router;
