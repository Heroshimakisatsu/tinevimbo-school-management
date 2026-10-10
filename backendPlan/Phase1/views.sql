-- ============================================================
-- TINEVIMBO SCHOOL MANAGEMENT SYSTEM
-- SQLite Views — 8 Aggregation Views
-- ============================================================

-- ============================================================
-- VIEW 1: uniform_stock_totals
-- Total stock per uniform item + stock status badge
-- Used by: Uniform Inventory page
-- ============================================================
CREATE VIEW IF NOT EXISTS uniform_stock_totals AS
SELECT
  u.id,
  u.name,
  u.category,
  u.applicable_gender,
  u.price,
  u.color,
  u.description,
  COALESCE(SUM(s.quantity), 0) AS total_stock,
  CASE
    WHEN COALESCE(SUM(s.quantity), 0) = 0 THEN 'out-of-stock'
    WHEN MIN(s.quantity) <= 5             THEN 'low-stock'
    ELSE                                       'in-stock'
  END AS stock_status
FROM uniform_inventory u
LEFT JOIN uniform_sizes s ON s.uniform_id = u.id
GROUP BY u.id;

-- ============================================================
-- VIEW 2: student_monthly_financial
-- Month-by-month payment breakdown per student
-- Used by: Tracer (expanded row financial panel)
-- ============================================================
CREATE VIEW IF NOT EXISTS student_monthly_financial AS
SELECT
  t.registration_number,
  strftime('%Y-%m', t.date)                                         AS month,
  SUM(CASE WHEN t.type = 'tuition'   THEN t.amount ELSE 0 END)     AS tuition,
  SUM(CASE WHEN t.type = 'transport' THEN t.amount ELSE 0 END)     AS transport,
  SUM(CASE WHEN t.type = 'relish'    THEN t.amount ELSE 0 END)     AS relish,
  SUM(CASE WHEN t.type = 'uniform'   THEN t.amount ELSE 0 END)     AS uniform,
  SUM(CASE WHEN t.type = 'other'     THEN t.amount ELSE 0 END)     AS other,
  SUM(t.amount)                                                     AS total
FROM transactions t
GROUP BY t.registration_number, strftime('%Y-%m', t.date);

-- ============================================================
-- VIEW 3: incomplete_payments_current_month
-- Students who have paid < 80% of expected fees this month
-- Used by: Tracer (incomplete filter), Tracer summary card
-- ============================================================
CREATE VIEW IF NOT EXISTS incomplete_payments_current_month AS
SELECT
  s.registration_number,
  s.first_name || ' ' || s.surname                    AS name,
  s.grade,
  tf.tuition_fee
    + COALESCE(tf.transport_fee, 0)
    + COALESCE(tf.relish_fee, 0)                      AS expected,
  COALESCE(SUM(t.amount), 0)                          AS paid,
  ROUND(
    COALESCE(SUM(t.amount), 0) * 100.0 /
    NULLIF(
      tf.tuition_fee
        + COALESCE(tf.transport_fee, 0)
        + COALESCE(tf.relish_fee, 0),
    0)
  , 1)                                                AS percent_paid,
  (
    tf.tuition_fee
      + COALESCE(tf.transport_fee, 0)
      + COALESCE(tf.relish_fee, 0)
  ) - COALESCE(SUM(t.amount), 0)                      AS debt
FROM students s
JOIN term_fees tf
  ON  tf.grade         = s.grade
  AND tf.academic_year = strftime('%Y', 'now')
LEFT JOIN transactions t
  ON  t.registration_number = s.registration_number
  AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
WHERE s.status = 'active'
GROUP BY s.registration_number
HAVING percent_paid < 80 OR paid = 0;

-- ============================================================
-- VIEW 4: tracer_summary
-- Summary card counts for the Tracer page header
-- Used by: Tracer, Dashboard
-- ============================================================
CREATE VIEW IF NOT EXISTS tracer_summary AS
SELECT
  COUNT(CASE WHEN status = 'active'      THEN 1 END) AS active_students,
  COUNT(CASE WHEN status = 'transferred' THEN 1 END) AS pending_deletions,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 7
      AND status = 'active'
    THEN 1 END
  )                                                   AS new_this_week
FROM students;

-- ============================================================
-- VIEW 5: dashboard_stats
-- Top-level KPI cards for the Dashboard
-- Used by: Dashboard (stats grid)
-- ============================================================
CREATE VIEW IF NOT EXISTS dashboard_stats AS
SELECT
  (
    SELECT COUNT(*) FROM students WHERE status = 'active'
  )                                                   AS active_students,
  (
    SELECT COUNT(*) FROM students WHERE status = 'transferred'
  )                                                   AS pending_deletions,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  )                                                   AS total_revenue,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM expenses
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  )                                                   AS total_expenses;

-- ============================================================
-- VIEW 6: student_statistics
-- ECD / Primary / Secondary breakdown with age buckets
-- Used by: Dashboard (student statistics table)
-- ============================================================
CREATE VIEW IF NOT EXISTS student_statistics AS
SELECT
  CASE
    WHEN grade LIKE 'ECD%'   THEN 'ecd'
    WHEN grade LIKE 'Grade%' THEN 'primary'
    WHEN grade LIKE 'Form%'  THEN 'secondary'
  END                                                 AS category,
  COUNT(*)                                            AS total,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 7
    THEN 1 END
  )                                                   AS new_this_week,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 30
    THEN 1 END
  )                                                   AS new_this_month,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) > 30
    THEN 1 END
  )                                                   AS month_old
FROM students
WHERE status = 'active'
GROUP BY category;

-- ============================================================
-- VIEW 7: grade_distribution
-- Old vs new students per grade — feeds both bar charts
-- Used by: Dashboard (ECD/Primary chart + Secondary chart)
-- ============================================================
CREATE VIEW IF NOT EXISTS grade_distribution AS
SELECT
  grade,
  COUNT(*)                                            AS total,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) <= 30
    THEN 1 END
  )                                                   AS new_students,
  COUNT(
    CASE WHEN
      CAST((julianday('now') - julianday(registration_date)) AS INTEGER) > 30
    THEN 1 END
  )                                                   AS returning_students
FROM students
WHERE status = 'active'
GROUP BY grade;

-- ============================================================
-- VIEW 8: school_inventory_stats
-- Aggregate stats for School Inventory page header cards
-- Used by: School Inventory (stats cards)
-- ============================================================
CREATE VIEW IF NOT EXISTS school_inventory_stats AS
SELECT
  COUNT(*)                                              AS total_items,
  COALESCE(SUM(quantity * unit_cost), 0)                AS total_value,
  COUNT(CASE WHEN status = 'low-stock'    THEN 1 END)   AS low_stock,
  COUNT(CASE WHEN status = 'out-of-stock' THEN 1 END)   AS out_of_stock
FROM school_inventory;
