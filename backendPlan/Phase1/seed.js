// server/db/seed.js
// Runs once on first startup to populate uniform items and expense types
// Safe to re-run — uses INSERT OR IGNORE

const seedDatabase = (db) => {
  console.log('[Seed] Checking if seed data is needed...');

  // ── Receipt sequence — single row ──────────────────────────
  db.prepare(`
    INSERT OR IGNORE INTO receipt_sequence (id, last_receipt_number)
    VALUES (1, 0)
  `).run();

  // ── Expense types ───────────────────────────────────────────
  const expenseTypes = [
    'Salaries',
    'Fuel',
    'Stationery',
    'Cleaning Supplies',
    'Bread & Relish',
    'Maintenance',
    'Electricity',
    'Water',
    'Transport',
    'Food Supplies',
    'Medical',
    'Security',
    'Printing',
    'Internet & Communication',
    'Bank Charges',
  ];

  const insertExpenseType = db.prepare(`
    INSERT OR IGNORE INTO expense_types (name) VALUES (?)
  `);

  const seedExpenseTypes = db.transaction(() => {
    for (const name of expenseTypes) {
      insertExpenseType.run(name);
    }
  });

  seedExpenseTypes();
  console.log('[Seed] Expense types seeded.');

  // ── Uniform inventory items ─────────────────────────────────
  const uniformItems = [
    // ── ECD → Grade 2 ────────────────────────────────────────
    { name: 'Dress',                category: 'ecd-grade2', applicable_gender: 'female' },
    { name: 'Tie',                  category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Blazer',               category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Tracksuit',            category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Hat',                  category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Jersey',               category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Boys Uniform Short',   category: 'ecd-grade2', applicable_gender: 'male'   },
    { name: 'Sports Wear Short',    category: 'ecd-grade2', applicable_gender: 'unisex' },
    { name: 'Sports Wear T-Shirt',  category: 'ecd-grade2', applicable_gender: 'unisex' },

    // ── Grade 3 → Grade 7 ─────────────────────────────────────
    { name: 'School Dress',         category: 'grade3-7',   applicable_gender: 'female' },
    { name: 'School Tie',           category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'School Blazer',        category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'Boys Uniform Short',   category: 'grade3-7',   applicable_gender: 'male'   },
    { name: 'Boys Uniform Shirt',   category: 'grade3-7',   applicable_gender: 'male'   },
    { name: 'Primary Tracksuit',    category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'Primary Sunhat',       category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'Primary Jersey',       category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'Sports Wear Short',    category: 'grade3-7',   applicable_gender: 'unisex' },
    { name: 'Sports Wear Shirt',    category: 'grade3-7',   applicable_gender: 'unisex' },

    // ── Form 1 → Form 4 ──────────────────────────────────────
    { name: 'School Blazer',        category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Tracksuit Set',        category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Boys Uniform Trousers',category: 'form1-4',    applicable_gender: 'male'   },
    { name: 'School Shirt',         category: 'form1-4',    applicable_gender: 'male'   },
    { name: 'Jersey',               category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Cap',                  category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Sun Hat',              category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Socks',                category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Sports Wear Short',    category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Sports Wear T-Shirt',  category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Tie',                  category: 'form1-4',    applicable_gender: 'unisex' },
    { name: 'Girls Skirt',          category: 'form1-4',    applicable_gender: 'female' },

    // ── Form 5 → Form 6 ──────────────────────────────────────
    { name: 'Sports Wear T-Shirt',  category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Sports Wear Short',    category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'School Blazer',        category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Tracksuit Set',        category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Boys Uniform Trousers',category: 'form5-6',    applicable_gender: 'male'   },
    { name: 'School Shirt',         category: 'form5-6',    applicable_gender: 'male'   },
    { name: 'Jersey',               category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Cap',                  category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Sun Hat',              category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Socks',                category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Tie',                  category: 'form5-6',    applicable_gender: 'unisex' },
    { name: 'Girls Skirt',          category: 'form5-6',    applicable_gender: 'female' },
  ];

  const insertUniform = db.prepare(`
    INSERT OR IGNORE INTO uniform_inventory
      (name, category, applicable_gender, price)
    VALUES
      (@name, @category, @applicable_gender, 0)
  `);

  const seedUniforms = db.transaction(() => {
    for (const item of uniformItems) {
      insertUniform.run(item);
    }
  });

  seedUniforms();
  console.log(`[Seed] ${uniformItems.length} uniform items seeded.`);
  console.log('[Seed] Done. Database is ready.');
};

module.exports = { seedDatabase };
