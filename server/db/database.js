// server/db/database.js
// SQLite connection using better-sqlite3
// Runs schema, views, triggers, and seed on startup

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { seedDatabase } = require('./seed');

// ── Database file location ──────────────────────────────────
// Stored in the project root as local.db
const DB_PATH = path.join(__dirname, '../../local.db');

let db;

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialised. Call initDb() first.');
  }
  return db;
};

const initDb = () => {
  console.log(`[DB] Opening database at: ${DB_PATH}`);

  db = new Database(DB_PATH, {
    // verbose: console.log  // uncomment for query logging during dev
  });

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  // Enforce foreign key constraints
  db.pragma('foreign_keys = ON');

  // ── Run schema, views, triggers ──────────────────────────
  runSqlFile('schema.sql');
  runSqlFile('views.sql');
  runSqlFile('triggers.sql');

  ensureLegacyColumns();

  // Defensive migration for existing local SQLite DBs created before the audit log table existed.
  db.prepare(`
    CREATE TABLE IF NOT EXISTS logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type     TEXT NOT NULL DEFAULT 'receipt_number',
      payment_type    TEXT NOT NULL,
      changed_by      TEXT NOT NULL,
      previous_value  TEXT,
      new_value       TEXT NOT NULL,
      reason          TEXT NOT NULL,
      details         TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // ── Seed initial data ────────────────────────────────────
  seedDatabase(db);

  console.log('[DB] Database ready.');
  return db;
};

// ── Helper: read and execute a .sql file ───────────────────
const ensureLegacyColumns = () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  const tableNames = new Set(tables.map(table => table.name));

  if (tableNames.has('transactions')) {
    const columns = db.prepare("PRAGMA table_info(transactions)").all();
    const columnNames = new Set(columns.map(column => column.name));

    if (!columnNames.has('receipt_book_type')) {
      db.prepare("ALTER TABLE transactions ADD COLUMN receipt_book_type TEXT NOT NULL DEFAULT 'secondary_tuition'").run();
      console.log('[DB] Added legacy column: transactions.receipt_book_type');
    }

    if (columnNames.has('uniform_size')) {
      try {
        db.prepare("ALTER TABLE transactions DROP COLUMN uniform_size").run();
        console.log('[DB] Dropped legacy transactions.uniform_size column');
      } catch (err) {
        console.warn('[DB] Could not drop transactions.uniform_size:', err.message);
      }
    }
  }

  if (tableNames.has('uniform_sales')) {
    const columns = db.prepare("PRAGMA table_info(uniform_sales)").all();
    const columnNames = new Set(columns.map(column => column.name));

    if (columnNames.has('uniform_id')) {
      try {
        db.prepare("ALTER TABLE uniform_sales DROP COLUMN uniform_id").run();
        console.log('[DB] Dropped redundant uniform_sales.uniform_id column (normalized to 3NF)');
      } catch (err) {
        console.warn('[DB] Could not drop uniform_sales.uniform_id:', err.message);
      }
    }
  }

  if (tableNames.has('receipt_log')) {
    const columns = db.prepare("PRAGMA table_info(receipt_log)").all();
    const columnNames = new Set(columns.map(column => column.name));

    if (!columnNames.has('receipt_book_type')) {
      db.prepare("ALTER TABLE receipt_log ADD COLUMN receipt_book_type TEXT NOT NULL DEFAULT 'primary_tuition'").run();
      console.log('[DB] Added missing column: receipt_log.receipt_book_type');
    }
  }

  const sequenceTables = [
    'receipt_sequence_secondary_tuition',
    'receipt_sequence_primary_tuition',
    'receipt_sequence_transport',
    'receipt_sequence_relish',
    'receipt_sequence_uniform',
    'receipt_sequence_other'
  ];

  for (const sequenceTable of sequenceTables) {
    if (!tableNames.has(sequenceTable)) {
      db.prepare(`CREATE TABLE IF NOT EXISTS ${sequenceTable} (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        last_receipt_number INTEGER NOT NULL DEFAULT 0,
        last_updated_at TEXT DEFAULT (datetime('now'))
      )`).run();
      db.prepare(`INSERT OR IGNORE INTO ${sequenceTable} (id, last_receipt_number) VALUES (1, 0)`).run();
      console.log(`[DB] Created missing sequence table: ${sequenceTable}`);
    }
  }
};

const runSqlFile = (filename) => {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`[DB] SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // Split on semicolons, but handle CREATE TRIGGER blocks (BEGIN...END) as single units
  // This handles multiline CREATE TABLE / VIEW / TRIGGER blocks correctly
  // (better-sqlite3 does not support multi-statement exec directly)
  const statements = [];
  let currentStatement = '';
  let inTriggerBlock = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('--')) {
      continue;
    }

    currentStatement += line + '\n';

    // Detect trigger block start
    if (trimmed.toUpperCase().startsWith('CREATE TRIGGER')) {
      inTriggerBlock = true;
    }

    // Detect trigger block end
    if (inTriggerBlock && trimmed.toUpperCase() === 'END;') {
      inTriggerBlock = false;
      statements.push(currentStatement.trim());
      currentStatement = '';
    } else if (!inTriggerBlock && trimmed.endsWith(';')) {
      // Regular statement ending with semicolon
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  const runStatements = db.transaction(() => {
    for (const statement of statements) {
      if (!statement || statement.length < 2) continue;
      
      try {
        db.prepare(statement).run();
      } catch (err) {
        // Views/triggers may already exist — ignore those errors
        if (!err.message.includes('already exists')) {
          console.error(`[DB] Error in ${filename}:`, err.message);
          console.error('[DB] Statement:', statement.substring(0, 80));
          throw err;
        }
      }
    }
  });

  runStatements();
  console.log(`[DB] Executed: ${filename}`);
};

module.exports = { initDb, getDb };
