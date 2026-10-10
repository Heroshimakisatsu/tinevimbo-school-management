const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'local.db');
const migrationPath = path.join(__dirname, 'migrations', 'add_initial_quantity.sql');

console.log('[Migration] Running add_initial_quantity.sql...');

const db = new Database(DB_PATH);
const sql = fs.readFileSync(migrationPath, 'utf8');

const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 2 && !s.startsWith('--'));

for (const statement of statements) {
  try {
    db.prepare(statement).run();
    console.log('[Migration] Executed:', statement.substring(0, 60));
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('[Migration] Column already exists, skipping...');
    } else {
      console.error('[Migration] Error:', err.message);
      throw err;
    }
  }
}

db.close();
console.log('[Migration] Complete!');
