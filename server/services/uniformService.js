// server/services/uniformService.js
// Uniform card filtering, stock management, grade-to-category mapping
// Uses getDb() pattern — called inside functions, never at module load time

const { getDb } = require('../db/database');

// ── Grade → category code mapping ─────────────────────────
const getGradeCode = (grade) => {
  if (['ECD A', 'ECD B', 'Grade 1', 'Grade 2'].includes(grade)) return 'ecd-grade2';
  if (['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(grade)) return 'grade3-7';
  if (['Form 1', 'Form 2', 'Form 3', 'Form 4'].includes(grade)) return 'form1-4';
  if (['Form 5', 'Form 6'].includes(grade)) return 'form5-6';
  throw new Error(`Unknown grade for uniform mapping: "${grade}"`);
};

// ── Get uniform cards filtered by grade and gender ─────────
// Used by Intake (new student form) and Finance (existing student)
// Returns uniforms with sizes array and total_stock
const getCardsByGradeGender = (grade, gender) => {
  const db       = getDb();
  const category = getGradeCode(grade);

  const rows = db.prepare(`
    SELECT
      ui.*,
      GROUP_CONCAT(
        us.id || ':' || us.size_label || ':' || us.quantity
      ) AS sizes_str,
      COALESCE(SUM(us.quantity), 0) AS total_stock
    FROM uniform_inventory ui
    LEFT JOIN uniform_sizes us ON us.uniform_id = ui.id
    WHERE ui.category = ?
      AND ui.applicable_gender IN (?, 'unisex')
    GROUP BY ui.id
    ORDER BY ui.name
  `).all(category, gender);

  return rows.map(row => {
    const sizes = row.sizes_str
      ? row.sizes_str.split(',').map(s => {
          const [id, size_label, quantity] = s.split(':');
          return {
            id:         parseInt(id),
            size_label,
            quantity:   parseInt(quantity),
          };
        })
      : [];

    const { sizes_str, ...rest } = row;
    return { ...rest, sizes };
  });
};

// ── Safely decrement stock after a uniform sale ────────────
// Guards against negative stock — only runs if quantity >= qty
// Supports normalized signature (sizeId, qty) and legacy (uniformId, sizeId, qty)
const decrementStock = (firstArg, secondArg, thirdArg) => {
  const db = getDb();
  let sizeId;
  let qty;

  if (thirdArg !== undefined) {
    // Legacy signature: (uniformId, sizeId, qty)
    sizeId = secondArg;
    qty    = thirdArg;
  } else {
    // Normalized signature: (sizeId, qty = 1)
    sizeId = firstArg;
    qty    = secondArg !== undefined ? secondArg : 1;
  }

  const result = db.prepare(`
    UPDATE uniform_sizes
    SET quantity  = quantity - ?,
        synced_at = NULL
    WHERE id        = ?
      AND quantity >= ?
  `).run(qty, sizeId, qty);

  return result;
};

module.exports = {
  getGradeCode,
  getCardsByGradeGender,
  decrementStock,
};
