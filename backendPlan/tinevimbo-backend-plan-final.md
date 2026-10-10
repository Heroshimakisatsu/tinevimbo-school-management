# Tinevimbo School Management System
## Final Backend Planning Document
### All decisions reconciled — ready for implementation

---

## 1. SYSTEM ARCHITECTURE

```
[React Frontend :5173] ──► [Express API :3001] ──► [SQLite local.db]
                                                          │
                                                    (when online)
                                                    auto every 30s
                                                    + manual button
                                                          │
                                                          ▼
                                                   [Supabase Cloud]
                                                          │
                                                       (reads)
                                                          │
                                                          ▼
                                               [Reporting Dashboard]
```

### Core Rules
- Local app is the **only writer** — all data entry happens here
- Supabase is a **read-only mirror** for remote reporting
- **Local always wins** on sync conflicts — no merge, no prompt
- Sync triggers **automatically** when internet detected (every 30s)
- Sync also available via **manual Sync button**
- Node 18+ native `fetch()` used for online detection — no node-fetch needed

---

## 2. TECH STACK

| Layer | Choice | Reason |
|-------|--------|--------|
| Backend | Express.js | Simple, lightweight, fits local desktop app |
| Database | SQLite via `better-sqlite3` | File-based, no server needed, fast for local |
| Cloud sync | `@supabase/supabase-js` | Official client, upserts cleanly |
| Online detection | Node 18+ native `fetch()` | No extra dependency needed |
| Dev runner | `concurrently` + `nodemon` | Run React + Express together with one command |

---

## 3. FOLDER STRUCTURE

```
tinevimbo-school-management/
├── src/                              # Existing React frontend (unchanged)
├── local.db                          # SQLite database (auto-created on first run)
├── .env                              # Environment variables (never commit)
├── .env.example                      # Template (commit this)
├── package.json                      # Updated with server scripts + deps
└── server/                           # All new backend code
    ├── index.js                      # Express entry point (:3001)
    ├── db/
    │   ├── database.js               # SQLite connection, runs SQL files on startup
    │   ├── schema.sql                # All 13 table definitions
    │   ├── views.sql                 # All 8 view definitions
    │   ├── triggers.sql              # All 7 trigger definitions
    │   └── seed.js                   # Uniform items + expense types seed
    ├── routes/
    │   ├── students.js               # Student CRUD + transfer/recover/bulk
    │   ├── intake.js                 # Atomic new student registration
    │   ├── payments.js               # Payment recording + history
    │   ├── termFees.js               # Term fee configuration
    │   ├── expenses.js               # Expense logging + quick cards
    │   ├── expenseTypes.js           # Expense type master list
    │   ├── uniformInventory.js       # Uniform stock management
    │   ├── uniformSizes.js           # Size management per uniform
    │   ├── schoolInventory.js        # School supplies management
    │   ├── dashboard.js              # Dashboard aggregation endpoints
    │   ├── tracer.js                 # Tracer monitoring endpoints
    │   └── sync.js                   # Manual sync trigger
    ├── services/
    │   ├── receiptService.js         # Receipt number logic
    │   ├── registrationService.js    # Reg number generation
    │   ├── uniformService.js         # Uniform card filtering
    │   └── paymentService.js         # Payment recording logic
    ├── sync/
    │   ├── syncToSupabase.js         # Core sync logic
    │   └── onlineWatcher.js          # Auto-detect internet, trigger sync
    └── supabase/
        └── client.js                 # Supabase client init
```

---

## 4. PACKAGE.JSON SCRIPTS

```json
"scripts": {
  "dev":          "concurrently \"npm run dev:client\" \"npm run dev:server\"",
  "dev:client":   "vite",
  "dev:server":   "nodemon server/index.js",
  "start:server": "node server/index.js",
  "build":        "tsc -b && vite build",
  "preview":      "vite preview"
}
```

New dependencies added:
```
express, cors, dotenv, better-sqlite3, @supabase/supabase-js,
concurrently, nodemon
```

---

## 5. DATABASE SCHEMA — ALL 13 TABLES

### TABLE 1: `students`
```sql
CREATE TABLE IF NOT EXISTS students (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number     TEXT UNIQUE NOT NULL,
  first_name              TEXT NOT NULL,
  second_name             TEXT,
  surname                 TEXT NOT NULL,
  initials                TEXT NOT NULL,
  grade                   TEXT NOT NULL,
  grade_code              TEXT NOT NULL,
  gender                  TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active',
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
```

**Field notes:**
- `grade` — "ECD A" | "ECD B" | "Grade 1"–"Grade 7" | "Form 1"–"Form 6"
- `grade_code` — "ecd-grade2" | "grade3-7" | "form1-4" | "form5-6"
- `gender` — "male" | "female"
- `status` — "active" | "transferred" | "graduated"
- `synced_at` — NULL means pending Supabase sync

---

### TABLE 2: `transactions`
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  registration_number TEXT NOT NULL
                      REFERENCES students(registration_number)
                      ON UPDATE CASCADE,
  receipt_number      TEXT NOT NULL,
  type                TEXT NOT NULL,
  amount              REAL NOT NULL DEFAULT 0,
  date                TEXT NOT NULL DEFAULT (date('now')),
  payment_method      TEXT NOT NULL DEFAULT 'cash',
  term                INTEGER NOT NULL,
  academic_year       TEXT NOT NULL,
  other_payment_name  TEXT,
  uniform_size        TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now'))
);
```

**Field notes:**
- `receipt_number` — 4-digit zero-padded string: "0001", "0042"
- ECD A/B: tuition + relish **share one receipt number**
- All other payment types: each gets its **own receipt number**
- `type` — "tuition" | "transport" | "relish" | "uniform" | "other"
- `payment_method` — "cash" | "ecocash" | "bank"

---

### TABLE 3: `term_fees`
```sql
CREATE TABLE IF NOT EXISTS term_fees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year   TEXT NOT NULL,
  term            INTEGER NOT NULL,
  grade           TEXT NOT NULL,
  tuition_fee     REAL NOT NULL DEFAULT 0,
  transport_fee   REAL,
  relish_fee      REAL,
  synced_at       TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(academic_year, term, grade)
);
```

**Field notes:**
- `transport_fee` — NULL if transport not applicable for this grade
- `relish_fee` — NULL if not ECD (only ECD A and ECD B have relish)

---

### TABLE 4: `expenses`
```sql
CREATE TABLE IF NOT EXISTS expenses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_type  TEXT NOT NULL
                REFERENCES expense_types(name) ON UPDATE CASCADE,
  description   TEXT,
  amount        REAL NOT NULL,
  date          TEXT NOT NULL DEFAULT (date('now')),
  synced_at     TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);
```

---

### TABLE 5: `expense_types`
```sql
CREATE TABLE IF NOT EXISTS expense_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

**Seeded with:** Salaries, Fuel, Stationery, Cleaning Supplies, Bread & Relish,
Maintenance, Electricity, Water, Transport, Food Supplies, Medical, Security,
Printing, Internet & Communication, Bank Charges

---

### TABLE 6: `expense_type_frequency`
```sql
CREATE TABLE IF NOT EXISTS expense_type_frequency (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_type    TEXT NOT NULL
                  REFERENCES expense_types(name) ON UPDATE CASCADE,
  day_of_week     INTEGER NOT NULL,
  count           INTEGER NOT NULL DEFAULT 0,
  last_amount     REAL,
  last_used_date  TEXT,
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(expense_type, day_of_week)
);
```

**Field notes:**
- `day_of_week` — 0=Sunday, 1=Monday ... 6=Saturday
- `last_amount` — pre-fills the amount modal when a quick card is clicked
- Updated on every expense submission

---

### TABLE 7: `uniform_inventory`
```sql
CREATE TABLE IF NOT EXISTS uniform_inventory (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  applicable_gender   TEXT NOT NULL DEFAULT 'unisex',
  price               REAL NOT NULL DEFAULT 0,
  color               TEXT,
  description         TEXT,
  synced_at           TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now'))
);
```

**Field notes:**
- `category` — "ecd-grade2" | "grade3-7" | "form1-4" | "form5-6"
- `applicable_gender` — "male" | "female" | "unisex"

---

### TABLE 8: `uniform_sizes`
```sql
CREATE TABLE IF NOT EXISTS uniform_sizes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uniform_id  INTEGER NOT NULL
              REFERENCES uniform_inventory(id) ON DELETE CASCADE,
  size_label  TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 0,
  synced_at   TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(uniform_id, size_label)
);
```

**Field notes:**
- `size_label` — "3-4 years" | "S" | "M" | "L" | "XL" | "28-30" etc.
- `updated_at` auto-updated by trigger on every quantity change

---

### TABLE 9: `uniform_sales`
```sql
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
```

---

### TABLE 10: `school_inventory`
```sql
CREATE TABLE IF NOT EXISTS school_inventory (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 0,
  min_stock       INTEGER NOT NULL DEFAULT 0,
  max_stock       INTEGER NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL,
  unit_cost       REAL NOT NULL DEFAULT 0,
  location        TEXT NOT NULL,
  supplier        TEXT,
  last_restocked  TEXT,
  status          TEXT DEFAULT 'in-stock',
  synced_at       TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
```

**Field notes:**
- `category` — "Stationery" | "Furniture" | "Food" | "Equipment" | "Cleaning"
- `unit` — "pieces" | "boxes" | "kg" | "litres" | "reams"
- `location` — "Storeroom" | "Office" | "Kitchen" | "Classroom" | "Sports Room"
- `status` — auto-computed by trigger: "in-stock" | "low-stock" | "out-of-stock"

---

### TABLE 11: `receipt_sequence`
```sql
CREATE TABLE IF NOT EXISTS receipt_sequence (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

-- Seeded with:
INSERT OR IGNORE INTO receipt_sequence (id, last_receipt_number) VALUES (1, 0);
```

**Field notes:**
- `CHECK (id = 1)` enforces single row — there is only ever one counter
- `last_receipt_number` is incremented on every transaction insert

---

### TABLE 12: `receipt_log`
```sql
CREATE TABLE IF NOT EXISTS receipt_log (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  expected_receipt_number   INTEGER NOT NULL,
  actual_receipt_number     INTEGER NOT NULL,
  gap                       INTEGER NOT NULL,
  alert_level               TEXT NOT NULL,
  reason                    TEXT,
  synced_at                 TEXT,
  created_at                TEXT DEFAULT (datetime('now'))
);
```

**Field notes:**
- `gap` = actual - expected
- `alert_level` — "normal" (gap=1) | "warning" (gap=2-3) | "high_alert" (gap≥4)

---

### TABLE 13: `sync_log`
```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name      TEXT NOT NULL,
  last_synced_at  TEXT NOT NULL,
  records_synced  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL,
  error_message   TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);
```

**Field notes:**
- `status` — "success" | "failed"
- One row inserted per table per sync attempt

---

## 6. DATABASE TRIGGERS — ALL 7

### Trigger 1 & 2: School Inventory Auto-Status
```sql
-- On INSERT
CREATE TRIGGER IF NOT EXISTS set_school_inventory_status_insert
AFTER INSERT ON school_inventory
BEGIN
  UPDATE school_inventory SET status = CASE
    WHEN NEW.quantity = 0              THEN 'out-of-stock'
    WHEN NEW.quantity <= NEW.min_stock THEN 'low-stock'
    ELSE 'in-stock'
  END WHERE id = NEW.id;
END;

-- On UPDATE
CREATE TRIGGER IF NOT EXISTS set_school_inventory_status_update
AFTER UPDATE OF quantity, min_stock ON school_inventory
BEGIN
  UPDATE school_inventory SET status = CASE
    WHEN NEW.quantity = 0              THEN 'out-of-stock'
    WHEN NEW.quantity <= NEW.min_stock THEN 'low-stock'
    ELSE 'in-stock'
  END WHERE id = NEW.id;
END;
```

### Triggers 3–6: updated_at Timestamps
```sql
-- students, uniform_inventory, uniform_sizes, school_inventory
CREATE TRIGGER IF NOT EXISTS update_[table]_timestamp
AFTER UPDATE ON [table]
BEGIN
  UPDATE [table] SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

### Trigger 7: Mark Uniform Unsynced on Stock Change
```sql
CREATE TRIGGER IF NOT EXISTS mark_uniform_unsynced_on_size_change
AFTER UPDATE OF quantity ON uniform_sizes
BEGIN
  UPDATE uniform_inventory SET synced_at = NULL WHERE id = NEW.uniform_id;
END;
```

---

## 7. DATABASE VIEWS — ALL 8

### VIEW 1: `uniform_stock_totals`
Total stock + status badge per uniform item.
Used by: Uniform Inventory page.
```sql
CREATE VIEW IF NOT EXISTS uniform_stock_totals AS
SELECT u.id, u.name, u.category, u.applicable_gender, u.price, u.color,
  COALESCE(SUM(s.quantity), 0) AS total_stock,
  CASE
    WHEN COALESCE(SUM(s.quantity), 0) = 0 THEN 'out-of-stock'
    WHEN MIN(s.quantity) <= 5             THEN 'low-stock'
    ELSE                                       'in-stock'
  END AS stock_status
FROM uniform_inventory u
LEFT JOIN uniform_sizes s ON s.uniform_id = u.id
GROUP BY u.id;
```

### VIEW 2: `student_monthly_financial`
Month-by-month payment breakdown per student.
Used by: Tracer (expanded row panel).
```sql
CREATE VIEW IF NOT EXISTS student_monthly_financial AS
SELECT
  t.registration_number,
  strftime('%Y-%m', t.date)                                      AS month,
  SUM(CASE WHEN t.type = 'tuition'   THEN t.amount ELSE 0 END)  AS tuition,
  SUM(CASE WHEN t.type = 'transport' THEN t.amount ELSE 0 END)  AS transport,
  SUM(CASE WHEN t.type = 'relish'    THEN t.amount ELSE 0 END)  AS relish,
  SUM(CASE WHEN t.type = 'uniform'   THEN t.amount ELSE 0 END)  AS uniform,
  SUM(CASE WHEN t.type = 'other'     THEN t.amount ELSE 0 END)  AS other,
  SUM(t.amount)                                                  AS total
FROM transactions t
GROUP BY t.registration_number, strftime('%Y-%m', t.date);
```

### VIEW 3: `incomplete_payments_current_month`
Students who paid < 80% of expected fees this month.
Used by: Tracer (incomplete filter + summary card).
```sql
CREATE VIEW IF NOT EXISTS incomplete_payments_current_month AS
SELECT
  s.registration_number,
  s.first_name || ' ' || s.surname AS name,
  s.grade,
  tf.tuition_fee + COALESCE(tf.transport_fee,0) + COALESCE(tf.relish_fee,0) AS expected,
  COALESCE(SUM(t.amount), 0) AS paid,
  ROUND(COALESCE(SUM(t.amount),0) * 100.0 /
    NULLIF(tf.tuition_fee + COALESCE(tf.transport_fee,0) + COALESCE(tf.relish_fee,0),0)
  ,1) AS percent_paid,
  (tf.tuition_fee + COALESCE(tf.transport_fee,0) + COALESCE(tf.relish_fee,0))
    - COALESCE(SUM(t.amount),0) AS debt
FROM students s
JOIN term_fees tf ON tf.grade = s.grade
  AND tf.academic_year = strftime('%Y','now')
LEFT JOIN transactions t ON t.registration_number = s.registration_number
  AND strftime('%Y-%m', t.date) = strftime('%Y-%m','now')
WHERE s.status = 'active'
GROUP BY s.registration_number
HAVING percent_paid < 80 OR paid = 0;
```

### VIEW 4: `tracer_summary`
Summary card counts for Tracer page header.
Used by: Tracer, Dashboard.
```sql
CREATE VIEW IF NOT EXISTS tracer_summary AS
SELECT
  COUNT(CASE WHEN status = 'active'      THEN 1 END) AS active_students,
  COUNT(CASE WHEN status = 'transferred' THEN 1 END) AS pending_deletions,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 7
    AND status = 'active' THEN 1 END)                AS new_this_week
FROM students;
```

### VIEW 5: `dashboard_stats`
Top-level KPI cards for the Dashboard.
Used by: Dashboard (stats grid).
```sql
CREATE VIEW IF NOT EXISTS dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM students WHERE status = 'active')        AS active_students,
  (SELECT COUNT(*) FROM students WHERE status = 'transferred')   AS pending_deletions,
  (SELECT COALESCE(SUM(amount),0) FROM transactions
   WHERE strftime('%Y-%m',date) = strftime('%Y-%m','now'))       AS total_revenue,
  (SELECT COALESCE(SUM(amount),0) FROM expenses
   WHERE strftime('%Y-%m',date) = strftime('%Y-%m','now'))       AS total_expenses;
```

### VIEW 6: `student_statistics`
ECD / Primary / Secondary breakdown with age buckets.
Used by: Dashboard (student statistics table).
```sql
CREATE VIEW IF NOT EXISTS student_statistics AS
SELECT
  CASE
    WHEN grade LIKE 'ECD%'   THEN 'ecd'
    WHEN grade LIKE 'Grade%' THEN 'primary'
    WHEN grade LIKE 'Form%'  THEN 'secondary'
  END AS category,
  COUNT(*) AS total,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 7
  THEN 1 END) AS new_this_week,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 30
  THEN 1 END) AS new_this_month,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) > 30
  THEN 1 END) AS month_old
FROM students
WHERE status = 'active'
GROUP BY category;
```

### VIEW 7: `grade_distribution`
Old vs new students per grade — feeds both bar charts.
Used by: Dashboard (ECD/Primary chart + Secondary chart).
```sql
CREATE VIEW IF NOT EXISTS grade_distribution AS
SELECT
  grade,
  COUNT(*) AS total,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 30
  THEN 1 END) AS new_students,
  COUNT(CASE WHEN
    CAST((julianday('now') - julianday(registration_date)) AS INTEGER) > 30
  THEN 1 END) AS returning_students
FROM students
WHERE status = 'active'
GROUP BY grade;
```

### VIEW 8: `school_inventory_stats`
Aggregate stats for School Inventory header cards.
Used by: School Inventory page.
```sql
CREATE VIEW IF NOT EXISTS school_inventory_stats AS
SELECT
  COUNT(*)                               AS total_items,
  COALESCE(SUM(quantity * unit_cost), 0) AS total_value,
  COUNT(CASE WHEN status = 'low-stock'    THEN 1 END) AS low_stock,
  COUNT(CASE WHEN status = 'out-of-stock' THEN 1 END) AS out_of_stock
FROM school_inventory;
```

---

## 8. ALGORITHMS

### 8.1 Registration Number Generation

```
PRIMARY (Grade 1–7):
  Format:   [FirstName[0]] + GRD + [GradeNumber] + [Surname[0]]
  Example:  Ishmael Chimusumba, Grade 5 → IGRD5C
  Conflict: IGRD5C → IGRD5C1 → IGRD5C2 ...

SECONDARY (Form 1–6):
  Format:   [FirstName[0]] + FRM + [FormNumber] + [Surname[0]]
  Example:  Tanaka Moyo, Form 5 → TFRM5M
  Conflict: TFRM5M → TFRM5M1 → TFRM5M2 ...

ECD A:
  Format:   [FirstName[0]] + ECDA + [Surname[0]]
  Example:  Tanaka Moyo, ECD A → TECDAM
  Conflict: TECDAM → TECDAM1 → TECDAM2 ...

ECD B:
  Format:   [FirstName[0]] + ECDB + [Surname[0]]
  Example:  Tanaka Moyo, ECD B → TECDBS (S = Surname[0])

Algorithm:
  base = buildBase(firstName, surname, grade)
  existing = SELECT reg_number FROM students WHERE reg_number LIKE base || '%'
  if existing is empty → return base
  counter = 1
  while (base + counter) in existing → counter++
  return base + counter
```

### 8.2 Annual Grade Promotion (Batch)

```
ECD A   → ECD B        (reg number regenerated)
ECD B   → Grade 1      (reg number regenerated)
Grade 1 → Grade 2
Grade 2 → Grade 3
Grade 3 → Grade 4
Grade 4 → Grade 5
Grade 5 → Grade 6
Grade 6 → Grade 7
Grade 7 → Form 1       (reg number regenerated)
Form 1  → Form 2
Form 2  → Form 3
Form 3  → Form 4
Form 4  → Form 5
Form 5  → Form 6
Form 6  → status = 'graduated'

On reg number regeneration:
  New reg number generated for student
  Old reg number kept as forwarding reference
  All transaction history stays linked via old reg number
```

### 8.3 Receipt Number Logic

```
Global counter in receipt_sequence (single row, id=1)

Normal flow:
  next = last_receipt_number + 1
  format zero-padded to 4 digits: "0001", "0042"
  UPDATE receipt_sequence SET last_receipt_number = next

ECD A/B special rule:
  Tuition + Relish SHARE one receipt number
  Both transaction rows get identical receipt_number
  Counter increments only ONCE for both

Finance module rule:
  Each payment type gets its OWN receipt number
  Tuition → receipt N
  Transport → receipt N+1
  (no sharing except the ECD tuition+relish rule above)

Spoil/Skip detection (when user manually inputs next receipt):
  gap = user_input - last_receipt_number
  gap = 1  → normal, proceed silently
  gap = 2  → 1 spoiled, prompt "1 receipt spoiled, confirm?"
  gap = 3  → 2 spoiled, prompt "Are you sure 2 receipts are spoiled?"
  gap ≥ 4  → HIGH ALERT, log as critical, require confirmation
  gap < 1  → ERROR, cannot go backwards

All gaps and spoils logged to receipt_log with alert_level
```

### 8.4 Uniform Card Filtering

```
Grade → Category mapping:
  ECD A, ECD B, Grade 1, Grade 2  → "ecd-grade2"
  Grade 3, Grade 4, Grade 5,
  Grade 6, Grade 7                → "grade3-7"
  Form 1, Form 2, Form 3, Form 4  → "form1-4"
  Form 5, Form 6                  → "form5-6"

Query:
  SELECT ui.*, GROUP_CONCAT(us.size_label||':'||us.quantity) AS sizes,
         SUM(us.quantity) AS total_stock
  FROM uniform_inventory ui
  JOIN uniform_sizes us ON us.uniform_id = ui.id
  WHERE ui.category = [mapped_category]
  AND   ui.applicable_gender IN ([gender], 'unisex')
  GROUP BY ui.id

Intake:  grade+gender from new student form inputs
Finance: grade+gender looked up from student's registration_number
```

### 8.5 Incomplete Payments Detection

```
For each active student in current month:
  expected = term_fees.tuition_fee
           + term_fees.transport_fee (if not NULL)
           + term_fees.relish_fee    (if not NULL — ECD only)
  paid     = SUM(transactions.amount) this month
  percent  = (paid / expected) * 100
  if percent < 80 → flag as INCOMPLETE, calculate debt = expected - paid
```

### 8.6 Expense Quick Cards Ordering

```
On page load → get today's day_of_week (0-6)

Query:
  SELECT expense_type, last_amount, count
  FROM expense_type_frequency
  WHERE day_of_week = today
  ORDER BY count DESC, expense_type ASC
  LIMIT 8

Card click flow:
  → Open amount modal pre-filled with last_amount (editable)
  → If type already in cart: prompt "Already in cart, add another?"
  → On confirm: add to cart with confirmed amount

On Submit All (bulk):
  INSERT all cart items into expenses
  UPSERT expense_type_frequency:
    count = count + 1
    last_amount = submitted amount
    last_used_date = today
  Clear cart
  Refresh cards (reorder)
```

---

## 9. ALL API ENDPOINTS

### Students
```
GET    /api/students                        List students
                                            Filters: ?status=active|transferred|graduated
                                                     ?view=primary|secondary
                                                     ?incomplete=true
GET    /api/students/search?q=              Search by name or reg number
GET    /api/students/:regNumber             Single student details
POST   /api/students                        Create student (internal use by intake)
PATCH  /api/students/:regNumber             Update student fields
PATCH  /api/students/:regNumber/transfer    Set status = transferred
PATCH  /api/students/:regNumber/recover     Set status = active
POST   /api/students/bulk-action            Promote or transfer many
                                            Body: { action, regNumbers[] }
```

### Intake
```
POST   /api/intake/register                 Atomic new student registration
                                            One transaction wraps:
                                            INSERT students
                                            INSERT transactions (all fees)
                                            INSERT uniform_sales (if any)
                                            DECREMENT uniform_sizes.quantity
                                            UPDATE receipt_sequence
                                            INSERT receipt_log (if gap)
```

### Transactions (Payments)
```
GET    /api/students/:regNumber/transactions        Full transaction history
POST   /api/students/:regNumber/transactions        Record new payment
GET    /api/students/:regNumber/payment-summary     Outstanding balance per category
GET    /api/students/:regNumber/financial-profile   12-month breakdown (Tracer)
```

### Term Fees
```
GET    /api/term-fees                       All term fees
GET    /api/term-fees?year=&term=&grade=    Filtered
POST   /api/term-fees                       Create fee structure
PATCH  /api/term-fees/:id                   Update fees
```

### Expenses
```
GET    /api/expenses                        All expenses
GET    /api/expenses/quick-cards?day=0-6    Cards ordered by frequency
GET    /api/expenses/summary                Totals by category
POST   /api/expenses/bulk                   Submit entire cart at once
```

### Expense Types
```
GET    /api/expense-types                   Master list
POST   /api/expense-types                   Add new type
PATCH  /api/expense-types/:id               Toggle active/inactive
```

### Uniform Inventory
```
GET    /api/uniforms                        All uniforms with sizes
GET    /api/uniforms?category=&gender=      Filtered (for intake/finance cards)
GET    /api/uniforms/stats                  Stock totals, low stock counts
POST   /api/uniforms                        Add new uniform
PATCH  /api/uniforms/:id                    Update price / colour / name
DELETE /api/uniforms/:id                    Delete + cascade sizes

POST   /api/uniforms/:id/sizes              Add size
PATCH  /api/uniforms/:id/sizes/:sizeId      Update quantity
DELETE /api/uniforms/:id/sizes/:sizeId      Remove size
```

### School Inventory
```
GET    /api/inventory                       All items
GET    /api/inventory?q=&category=&location= Filtered
GET    /api/inventory/stats                 Total items, value, low/out of stock
POST   /api/inventory                       Add item
PATCH  /api/inventory/:id                   Edit item
DELETE /api/inventory/:id                   Delete item
```

### Dashboard
```
GET    /api/dashboard/stats                 Top cards (students, revenue, expenses)
GET    /api/dashboard/daily-summary?date=   Daily fee breakdown by category
GET    /api/dashboard/weekly-financials     7-day income vs expenses
GET    /api/dashboard/student-statistics    ECD / Primary / Secondary counts
GET    /api/dashboard/grade-distribution    Old vs new per grade (both charts)
```

### Tracer
```
GET    /api/tracer/summary                  Summary cards (active, new, transferred, incomplete)
```

### Sync
```
POST   /api/sync                            Manually trigger Supabase sync
GET    /api/sync/status                     Last sync time, pending record count
```

### Health
```
GET    /api/health                          Server status check
```

---

## 10. SHARED SERVICES

### `receiptService.js`
```
getNextReceipt()         → increments counter, returns zero-padded string
detectGap(actual)        → compares to expected, returns alert_level + gap
logGap(gap, alertLevel)  → inserts row into receipt_log
formatReceipt(number)    → zero-pads to 4 digits: 42 → "0042"
```

### `registrationService.js`
```
generateRegNumber(firstName, surname, grade)  → unique reg number string
getGradeCategory(grade)                       → returns grade_code string
getNextGrade(grade)                           → returns next grade in sequence
buildInitials(firstName, secondName, surname) → e.g. "I.C." or "T.M."
```

### `uniformService.js`
```
getCardsByGradeGender(grade, gender)          → filtered uniform cards with sizes
decrementStock(uniformId, sizeId, qty)        → reduces quantity after sale
getGradeCode(grade)                           → maps grade to category string
```

### `paymentService.js`
```
recordTransactions(regNumber, payments[])     → bulk insert with receipt logic
getHistory(regNumber)                         → full transaction history
getOutstanding(regNumber, term, year)         → balance per category
```

---

## 11. SUPABASE SYNC STRATEGY

```
Every SQLite write → marks that row synced_at = NULL

onlineWatcher (runs every 30 seconds using Node 18+ native fetch):
  ping https://www.google.com
  if offline → do nothing, log status
  if online  → call syncToSupabase()

syncToSupabase():
  Tables synced IN THIS ORDER (respects foreign keys):
    1. students
    2. transactions
    3. expenses
    4. expense_types
    5. expense_type_frequency
    6. uniform_inventory
    7. uniform_sizes
    8. uniform_sales
    9. school_inventory
   10. receipt_log

  For each table:
    rows = SELECT * FROM table WHERE synced_at IS NULL
    if rows.length > 0:
      supabase.from(table).upsert(rows, { onConflict: 'id' })
      UPDATE table SET synced_at = datetime('now') WHERE id IN (...)
      INSERT into sync_log (table, records_synced, status='success')
    on error:
      INSERT into sync_log (table, records_synced=0, status='failed', error_message)

Manual sync:
  POST /api/sync → calls syncToSupabase() immediately
  GET  /api/sync/status → returns last sync time + pending count per table

Conflict resolution:
  Local ALWAYS wins
  Supabase upsert uses local data — no merge, no prompt
  onConflict: 'id' — matched by primary key

Supabase tables:
  Mirror SQLite exactly — same column names, same types
  Views and triggers NOT synced — Supabase has its own
```

---

## 12. UNIFORM INVENTORY SEED DATA — 43 ITEMS

### ECD → Grade 2 (`ecd-grade2`) — 9 items
| Name | Gender |
|------|--------|
| Dress | female |
| Tie | unisex |
| Blazer | unisex |
| Tracksuit | unisex |
| Hat | unisex |
| Jersey | unisex |
| Boys Uniform Short | male |
| Sports Wear Short | unisex |
| Sports Wear T-Shirt | unisex |

### Grade 3 → Grade 7 (`grade3-7`) — 10 items
| Name | Gender |
|------|--------|
| School Dress | female |
| School Tie | unisex |
| School Blazer | unisex |
| Boys Uniform Short | male |
| Boys Uniform Shirt | male |
| Primary Tracksuit | unisex |
| Primary Sunhat | unisex |
| Primary Jersey | unisex |
| Sports Wear Short | unisex |
| Sports Wear Shirt | unisex |

### Form 1 → Form 4 (`form1-4`) — 12 items
| Name | Gender |
|------|--------|
| School Blazer | unisex |
| Tracksuit Set | unisex |
| Boys Uniform Trousers | male |
| School Shirt | male |
| Jersey | unisex |
| Cap | unisex |
| Sun Hat | unisex |
| Socks | unisex |
| Sports Wear Short | unisex |
| Sports Wear T-Shirt | unisex |
| Tie | unisex |
| Girls Skirt | female |

### Form 5 → Form 6 (`form5-6`) — 12 items
| Name | Gender |
|------|--------|
| Sports Wear T-Shirt | unisex |
| Sports Wear Short | unisex |
| School Blazer | unisex |
| Tracksuit Set | unisex |
| Boys Uniform Trousers | male |
| School Shirt | male |
| Jersey | unisex |
| Cap | unisex |
| Sun Hat | unisex |
| Socks | unisex |
| Tie | unisex |
| Girls Skirt | female |

---

## 13. COMPLETE TABLE & VIEW INVENTORY

| # | Name | Type | Used By |
|---|------|------|---------|
| 1 | `students` | Table | Intake, Finance, Tracer, Dashboard |
| 2 | `transactions` | Table | Intake, Finance, Tracer, Dashboard |
| 3 | `term_fees` | Table | Finance, Tracer |
| 4 | `expenses` | Table | Expenses, Dashboard |
| 5 | `expense_types` | Table | Expenses |
| 6 | `expense_type_frequency` | Table | Expenses (quick cards) |
| 7 | `uniform_inventory` | Table | Uniform Inventory, Intake, Finance |
| 8 | `uniform_sizes` | Table | Uniform Inventory, Intake, Finance |
| 9 | `uniform_sales` | Table | Intake, Finance |
| 10 | `school_inventory` | Table | School Inventory |
| 11 | `receipt_sequence` | Table | Intake, Finance |
| 12 | `receipt_log` | Table | Intake, Finance |
| 13 | `sync_log` | Table | Sync |
| 14 | `uniform_stock_totals` | View | Uniform Inventory |
| 15 | `student_monthly_financial` | View | Tracer |
| 16 | `incomplete_payments_current_month` | View | Tracer |
| 17 | `tracer_summary` | View | Tracer, Dashboard |
| 18 | `dashboard_stats` | View | Dashboard |
| 19 | `student_statistics` | View | Dashboard |
| 20 | `grade_distribution` | View | Dashboard |
| 21 | `school_inventory_stats` | View | School Inventory |

**13 Tables · 8 Views · 7 Triggers**

---

## 14. BUILD PHASES

| Phase | What | Key Files |
|-------|------|-----------|
| **1** ✅ | Foundation — Express, SQLite, schema, views, triggers, seed | `server/index.js`, `server/db/*` |
| **2** | Students routes + registration service + receipt service | `routes/students.js`, `services/registrationService.js`, `services/receiptService.js` |
| **3** | Intake endpoint — atomic student registration | `routes/intake.js`, `services/uniformService.js` |
| **4** | Transactions routes + term fees routes | `routes/payments.js`, `routes/termFees.js`, `services/paymentService.js` |
| **5** | Expenses routes + expense types + quick cards | `routes/expenses.js`, `routes/expenseTypes.js` |
| **6** | Uniform inventory routes + sizes routes | `routes/uniformInventory.js`, `routes/uniformSizes.js` |
| **7** | School inventory routes | `routes/schoolInventory.js` |
| **8** | Tracer endpoints + Dashboard aggregation endpoints | `routes/tracer.js`, `routes/dashboard.js` |
| **9** | Supabase sync — auto watcher + manual endpoint | `sync/syncToSupabase.js`, `sync/onlineWatcher.js`, `routes/sync.js` |
| **10** | Frontend wiring — replace mock imports page by page | All `src/app/pages/*.tsx` |

---

## 15. DEVIN SCHEMA RECONCILIATION NOTES

All differences Devin flagged are resolved as follows:

| Devin Flag | Resolution |
|-----------|------------|
| Plan used `payments` table | **Final name: `transactions`** |
| Plan missing `second_name`, `initials`, `grade_code` | **All included** in final students table |
| Plan used `payment_id` in uniform_sales | **Final name: `transaction_id`** |
| Plan missing `updated_at` in uniform_sizes | **Included** + covered by trigger |
| No Express server | **`server/index.js`** provided in Phase 1 |
| No `concurrently` in package.json | **Added** to new package.json |
| `node-fetch` for online detection | **Not needed** — Node 18+ native fetch used |

---

*Tinevimbo School Management System — Final Backend Plan*
*Modules: Intake · Finance · Expenses · Uniform Inventory · School Inventory · Tracer · Dashboard · Sync*
*Status: Phase 1 complete — Phase 2 ready to begin*
