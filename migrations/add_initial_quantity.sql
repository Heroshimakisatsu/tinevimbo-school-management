-- Migration: Add initial_quantity to uniform_sizes
-- This allows tracking the original/max quantity set for each uniform size
-- Display format: remaining/initial (e.g., 30/80)

-- Add initial_quantity column to uniform_sizes
ALTER TABLE uniform_sizes ADD COLUMN initial_quantity INTEGER DEFAULT 0;

-- Update existing records: set initial_quantity to current quantity
-- This preserves the current state as the "initial" baseline
UPDATE uniform_sizes SET initial_quantity = quantity WHERE initial_quantity = 0;
