-- ============================================================
-- TINEVIMBO SCHOOL MANAGEMENT SYSTEM
-- SQLite Schema — 13 Tables
-- ============================================================

-- ============================================================
-- TABLE 1: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number     TEXT UNIQUE NOT NULL,
  first_name              TEXT NOT NULL,
  second_name             TEXT,
  surname                 TEXT NOT NULL,
  initials                TEXT NOT NULL,
  grade                   TEXT NOT NULL,
    -- ECD A | ECD B | Grade 1 | Grade 2 | ... | Grade 7
    -- Form 1 | Form 2 | ... | Form 6
  grade_code              TEXT NOT NULL,
    -- ecd-grade2 | grade3-7 | form1-4 | form5-6
  gender                  TEXT NOT NULL,
    -- male | female
  status                  TEXT NOT NULL DEFAULT 'active',
    -- active | transferred | graduated
  registration_fee_paid   INTEGER NOT NULL DEFAULT 0,
  registration_fee_amount REAL NOT NULL DEFAULT 0,
  registration_date       TEXT NOT NULL,
  is_transfer             INTEGER NOT NULL DEFAULT 0,
  transfer_date           TEXT,
  parent_phone_number     TEXT,
  parent_has_whatsapp     INTEGER DEFAULT 0,
  whatsapp_contact_name   TEXT,
  academic_year           TEXT NOT NULL,
  synced_at               TEXT,
  created_at              TEXT DEFAULT (datetime('now')),
  updated_at              TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 2: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number TEXT NOT NULL
                      REFERENCES students(registration_number)
                      ON UPDATE CASCADE,
  receipt_number      TEXT NOT NULL,
    -- 4-digit zero-padded string: "0001", "0042"
    -- ECD A/B: tuition + relish share one receipt number
    -- all other payments: each gets own receipt number
  type                TEXT NOT NULL,
    -- tuition | transport | relish | uniform | other
  amount              REAL NOT NULL DEFAULT 0,
  date                TEXT NOT NULL DEFAULT (date('now')),
  payment_method      TEXT NOT NULL DEFAULT 'cash',
    -- cash | ecocash | bank
  term                INTEGER NOT NULL,
    -- 1 | 2 | 3
  academic_year       TEXT NOT NULL,
  other_payment_name  TEXT,
    -- populated only when type = 'other'
  uniform_size        TEXT,
    -- populated only when type = 'uniform'
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 3: term_fees
-- Fee structure per grade per term per year
-- ============================================================
CREATE TABLE IF NOT EXISTS term_fees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year   TEXT NOT NULL,
  term            INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  tuition_fee     REAL NOT NULL DEFAULT 0,
  transport_fee   REAL,
    -- NULL means transport not applicable for this grade
  relish_fee      REAL,
    -- NULL means relish not applicable (only ECD A/B)
  synced_at       TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(academic_year, term, grade)
);

-- ============================================================
-- TABLE 4: expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_type  TEXT NOT NULL
                REFERENCES expense_types(name)
                ON UPDATE CASCADE,
  description   TEXT,
  amount        REAL NOT NULL,
  date          TEXT NOT NULL DEFAULT (date('now')),
  synced_at     TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 5: expense_types
-- Master list of valid expense type names
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 6: expense_type_frequency
-- Tracks how often each expense type is used per day of week
-- Powers the quick-add cards on the Expenses page
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_type_frequency (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_type    TEXT NOT NULL
                  REFERENCES expense_types(name)
                  ON UPDATE CASCADE,
  day_of_week     INTEGER NOT NULL,
    -- 0=Sunday, 1=Monday, 2=Tuesday ... 6=Saturday
  count           INTEGER NOT NULL DEFAULT 0,
  last_amount     REAL,
    -- pre-fills amount modal when card is clicked
  last_used_date  TEXT,
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(expense_type, day_of_week)
);

-- ============================================================
-- TABLE 7: uniform_inventory
-- Parent record — one row per uniform item per category
-- ============================================================
CREATE TABLE IF NOT EXISTS uniform_inventory (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
    -- ecd-grade2 | grade3-7 | form1-4 | form5-6
  applicable_gender   TEXT NOT NULL DEFAULT 'unisex',
    -- male | female | unisex
  price               REAL NOT NULL DEFAULT 0,
  color               TEXT,
  description         TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 8: uniform_sizes
-- Child records — one row per size per uniform item
-- ============================================================
CREATE TABLE IF NOT EXISTS uniform_sizes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uniform_id  INTEGER NOT NULL
              REFERENCES uniform_inventory(id)
              ON DELETE CASCADE,
  size_label  TEXT NOT NULL,
    -- "3-4 years" | "S" | "M" | "L" | "XL" | "28-30" etc.
  quantity    INTEGER NOT NULL DEFAULT 0,
  synced_at   TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(uniform_id, size_label)
);

-- ============================================================
-- TABLE 9: uniform_sales
-- Records every uniform item sold to a student
-- Links to transactions for the payment record
-- ============================================================
CREATE TABLE IF NOT EXISTS uniform_sales (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  uniform_id          INTEGER NOT NULL
                      REFERENCES uniform_inventory(id),
  uniform_size_id     INTEGER NOT NULL
                      REFERENCES uniform_sizes(id),
  registration_number TEXT NOT NULL
                      REFERENCES students(registration_number)
                      ON UPDATE CASCADE,
  transaction_id      INTEGER
                      REFERENCES transactions(id),
  quantity_sold       INTEGER NOT NULL DEFAULT 1,
  sale_date           TEXT NOT NULL DEFAULT (date('now')),
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 10: school_inventory
-- General school supplies, furniture, food stock
-- ============================================================
CREATE TABLE IF NOT EXISTS school_inventory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
    -- Stationery | Furniture | Food | Equipment | Cleaning
  quantity        INTEGER NOT NULL DEFAULT 0,
  min_stock       INTEGER NOT NULL DEFAULT 0,
  max_stock       INTEGER NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL,
    -- pieces | boxes | kg | litres | reams
  unit_cost       REAL NOT NULL DEFAULT 0,
  location        TEXT NOT NULL,
    -- Storeroom | Office | Kitchen | Classroom | Sports Room
  supplier        TEXT,
  last_restocked  TEXT,
  status          TEXT DEFAULT 'in-stock',
    -- auto-computed by trigger:
    -- quantity = 0          → out-of-stock
    -- quantity <= min_stock → low-stock
    -- quantity > min_stock  → in-stock
  synced_at       TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 11: receipt_sequence
-- Single-row global receipt counter
-- Enforced by CHECK (id = 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt_sequence (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 12: receipt_log
-- Audit trail for every receipt gap or spoil event
-- ============================================================
CREATE TABLE IF NOT EXISTS receipt_log (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  expected_receipt_number   INTEGER NOT NULL,
  actual_receipt_number     INTEGER NOT NULL,
  gap                       INTEGER NOT NULL,
    -- actual - expected
    -- gap = 1  → normal (no alert)
    -- gap = 2  → warning (1 spoiled)
    -- gap = 3  → warning (2 spoiled)
    -- gap >= 4 → high_alert (3+ spoiled)
  alert_level               TEXT NOT NULL,
    -- normal | warning | high_alert
  reason                    TEXT,
  synced_at                 TEXT,
  created_at                TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- TABLE 13: sync_log
-- History of every Supabase sync attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name      TEXT NOT NULL,
  last_synced_at  TEXT NOT NULL,
  records_synced  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL,
    -- success | failed
  error_message   TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
