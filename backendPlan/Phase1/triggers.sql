-- ============================================================
-- TINEVIMBO SCHOOL MANAGEMENT SYSTEM
-- SQLite Triggers
-- ============================================================

-- ============================================================
-- SCHOOL INVENTORY — Auto-compute status on INSERT
-- ============================================================
CREATE TRIGGER IF NOT EXISTS set_school_inventory_status_insert
AFTER INSERT ON school_inventory
BEGIN
  UPDATE school_inventory
  SET status = CASE
    WHEN NEW.quantity = 0              THEN 'out-of-stock'
    WHEN NEW.quantity <= NEW.min_stock THEN 'low-stock'
    ELSE                                    'in-stock'
  END
  WHERE id = NEW.id;
END;

-- ============================================================
-- SCHOOL INVENTORY — Auto-compute status on UPDATE
-- ============================================================
CREATE TRIGGER IF NOT EXISTS set_school_inventory_status_update
AFTER UPDATE OF quantity, min_stock ON school_inventory
BEGIN
  UPDATE school_inventory
  SET status = CASE
    WHEN NEW.quantity = 0              THEN 'out-of-stock'
    WHEN NEW.quantity <= NEW.min_stock THEN 'low-stock'
    ELSE                                    'in-stock'
  END
  WHERE id = NEW.id;
END;

-- ============================================================
-- STUDENTS — updated_at timestamp
-- ============================================================
CREATE TRIGGER IF NOT EXISTS update_students_timestamp
AFTER UPDATE ON students
BEGIN
  UPDATE students
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- ============================================================
-- UNIFORM INVENTORY — updated_at timestamp
-- ============================================================
CREATE TRIGGER IF NOT EXISTS update_uniform_inventory_timestamp
AFTER UPDATE ON uniform_inventory
BEGIN
  UPDATE uniform_inventory
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- ============================================================
-- UNIFORM SIZES — updated_at timestamp
-- ============================================================
CREATE TRIGGER IF NOT EXISTS update_uniform_sizes_timestamp
AFTER UPDATE ON uniform_sizes
BEGIN
  UPDATE uniform_sizes
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- ============================================================
-- SCHOOL INVENTORY — updated_at timestamp
-- ============================================================
CREATE TRIGGER IF NOT EXISTS update_school_inventory_timestamp
AFTER UPDATE ON school_inventory
BEGIN
  UPDATE school_inventory
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;

-- ============================================================
-- UNIFORM SIZES — mark parent uniform as unsynced on stock change
-- Ensures stock changes trigger a Supabase sync
-- ============================================================
CREATE TRIGGER IF NOT EXISTS mark_uniform_unsynced_on_size_change
AFTER UPDATE OF quantity ON uniform_sizes
BEGIN
  UPDATE uniform_inventory
  SET synced_at = NULL
  WHERE id = NEW.uniform_id;
END;
