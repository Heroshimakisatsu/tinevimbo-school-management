// server/routes/uniformSizes.js
// Size management for uniform items
// Mounted as nested routes under /api/uniforms/:id/sizes
// Uses mergeParams: true to inherit :id from parent router

const express   = require('express');
const router    = express.Router({ mergeParams: true });
const { getDb } = require('../db/database');

// ══════════════════════════════════════════════════════════════
// GET /api/uniforms/:id/sizes
// All sizes for a specific uniform
// ══════════════════════════════════════════════════════════════
router.get('/', (req, res) => {
  const db    = getDb();
  const sizes = db.prepare(`
    SELECT * FROM uniform_sizes
    WHERE uniform_id = ?
    ORDER BY size_label
  `).all(req.params.id);

  res.json({ data: sizes, count: sizes.length });
});

// ══════════════════════════════════════════════════════════════
// POST /api/uniforms/:id/sizes
// Add a new size to a uniform
// ══════════════════════════════════════════════════════════════
router.post('/', (req, res) => {
  const db                   = getDb();
  const { id }               = req.params;
  const { size_label, quantity = 0 } = req.body;

  if (!size_label) {
    return res.status(400).json({ error: 'size_label is required' });
  }

  // Verify parent uniform exists
  const uniform = db.prepare(`
    SELECT id FROM uniform_inventory WHERE id = ?
  `).get(id);

  if (!uniform) {
    return res.status(404).json({ error: 'Uniform not found' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO uniform_sizes (uniform_id, size_label, quantity, synced_at)
      VALUES (?, ?, ?, NULL)
    `).run(id, size_label, quantity);

    const created = db.prepare(`
      SELECT * FROM uniform_sizes WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ data: created });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: `Size "${size_label}" already exists for this uniform`,
      });
    }
    throw err;
  }
});

// ══════════════════════════════════════════════════════════════
// PATCH /api/uniforms/:id/sizes/:sizeId
// Update quantity for a specific size
// ══════════════════════════════════════════════════════════════
router.patch('/:sizeId', (req, res) => {
  const db                = getDb();
  const { id, sizeId }    = req.params;
  const { quantity, size_label } = req.body;

  if (quantity === undefined && size_label === undefined) {
    return res.status(400).json({ error: 'quantity or size_label is required' });
  }

  if (quantity !== undefined && quantity < 0) {
    return res.status(400).json({ error: 'quantity cannot be negative' });
  }

  const size = db.prepare(`
    SELECT * FROM uniform_sizes WHERE id = ? AND uniform_id = ?
  `).get(sizeId, id);

  if (!size) {
    return res.status(404).json({ error: 'Size not found' });
  }

  const updates = {};
  if (quantity  !== undefined) updates.quantity   = quantity;
  if (size_label !== undefined) updates.size_label = size_label;

  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values    = [...Object.values(updates), sizeId, id];

  db.prepare(`
    UPDATE uniform_sizes
    SET ${setClause}, synced_at = NULL
    WHERE id = ? AND uniform_id = ?
  `).run(...values);

  const updated = db.prepare(`
    SELECT * FROM uniform_sizes WHERE id = ?
  `).get(sizeId);

  res.json({ data: updated });
});

// ══════════════════════════════════════════════════════════════
// DELETE /api/uniforms/:id/sizes/:sizeId
// Remove a size from a uniform
// ══════════════════════════════════════════════════════════════
router.delete('/:sizeId', (req, res) => {
  const db             = getDb();
  const { id, sizeId } = req.params;

  const size = db.prepare(`
    SELECT * FROM uniform_sizes WHERE id = ? AND uniform_id = ?
  `).get(sizeId, id);

  if (!size) {
    return res.status(404).json({ error: 'Size not found' });
  }

  db.prepare(`
    DELETE FROM uniform_sizes WHERE id = ? AND uniform_id = ?
  `).run(sizeId, id);

  res.json({
    message: `Size "${size.size_label}" removed successfully`,
  });
});

module.exports = router;
