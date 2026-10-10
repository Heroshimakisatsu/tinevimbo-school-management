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

  // ── Seed initial data ────────────────────────────────────
  seedDatabase(db);

  console.log('[DB] Database ready.');
  return db;
};

// ── Helper: read and execute a .sql file ───────────────────
const runSqlFile = (filename) => {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    console.error(`[DB] SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // Split on semicolons followed by a newline
  // This handles multiline CREATE TABLE / VIEW / TRIGGER blocks correctly
  // (better-sqlite3 does not support multi-statement exec directly)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && !s.startsWith('--'));

  const runStatements = db.transaction(() => {
    for (const statement of statements) {
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
