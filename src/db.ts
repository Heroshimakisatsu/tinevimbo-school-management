import Database from 'better-sqlite3';

// Initialize a local SQLite database file named `local.db` in the project root.
// The database will be created automatically if it does not exist.
const db = new Database('local.db');

// Ensure the tables exist. No seed data – tables start empty.
// Students table now stores registration number, initials and grade code for later lookup.
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    second_name TEXT,
    surname TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    initials TEXT NOT NULL,
    grade_code TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    type TEXT NOT NULL,
    receipt_number TEXT NOT NULL,
    amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;
