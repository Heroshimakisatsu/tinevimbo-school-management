-- Migration: Add receipt book types for separate receipt numbering
-- This adds receipt_book_type column to transactions and creates separate receipt sequence tables

-- Add receipt_book_type column to transactions table
ALTER TABLE transactions ADD COLUMN receipt_book_type TEXT NOT NULL DEFAULT 'secondary_tuition';

-- Create receipt sequence tables for each book type
CREATE TABLE IF NOT EXISTS receipt_sequence_secondary_tuition (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_sequence_primary_tuition (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_sequence_transport (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_sequence_relish (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_sequence_uniform (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS receipt_sequence_other (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  last_receipt_number INTEGER NOT NULL DEFAULT 0,
  last_updated_at     TEXT DEFAULT (datetime('now'))
);

-- Add receipt_book_type column to receipt_log if it exists
-- Note: This might fail if the column already exists, which is fine
ALTER TABLE receipt_log ADD COLUMN receipt_book_type TEXT;

-- Initialize receipt sequences based on existing transactions
-- This sets the sequence counters to the max receipt number for each book type
INSERT OR IGNORE INTO receipt_sequence_secondary_tuition (id, last_receipt_number)
SELECT 1, COALESCE(MAX(CAST(receipt_number AS INTEGER)), 0)
FROM transactions
WHERE receipt_book_type = 'secondary_tuition';

INSERT OR IGNORE INTO receipt_sequence_primary_tuition (id, last_receipt_number)
SELECT 1, COALESCE(MAX(CAST(receipt_number AS INTEGER)), 0)
FROM transactions
WHERE receipt_book_type = 'primary_tuition';

INSERT OR IGNORE INTO receipt_sequence_transport (id, last_receipt_number)
SELECT 1, COALESCE(MAX(CAST(receipt_number AS INTEGER)), 0)
FROM transactions
WHERE receipt_book_type = 'transport';

-- Update existing transactions to set appropriate receipt_book_type
-- For existing transactions, we'll set them based on type and student grade
UPDATE transactions t
SET receipt_book_type = 
  CASE 
    WHEN t.type = 'transport' THEN 'transport'
    WHEN s.grade_code IN ('ecd-grade2', 'grade3-7') THEN 'primary_tuition'
    WHEN s.grade_code IN ('form1-4', 'form5-6') THEN 'secondary_tuition'
    ELSE 'primary_tuition'
  END
FROM students s
WHERE t.registration_number = s.registration_number;
