// FROZEN: Supabase sync paused until reconnect. Do not modify or trigger in active dev.
const { createClient } = require('@supabase/supabase-js');
const { getDb } = require('../db/database');

// Initialize Supabase client (Ensure these are in your .env file)
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define tables to sync in an ordered array to respect foreign key constraints if applicable
const tablesToSync = [
  'students',
  'term_fees',
  'transactions',
  'expense_types',
  'expenses',
  'uniform_inventory',
  'uniform_sizes',
  'uniform_sales',
  'school_inventory',
  'receipt_log',
];

const syncToSupabase = async () => {
  console.log('[Sync] Starting synchronization to Supabase...');
  let successCount = 0;
  let errorCount = 0;

  const db = getDb();

  for (const table of tablesToSync) {
    try {
      const unsynced = db.prepare(`SELECT * FROM ${table} WHERE synced_at IS NULL`).all();
      if (unsynced.length === 0) continue;

      const pk = table === 'students' ? 'registration_number' : 'id';
      const { error } = await supabase.from(table).upsert(unsynced, { onConflict: pk });

      if (error) {
        console.error(`[Sync] Error syncing table ${table}:`, error.message);
        errorCount++;
      } else {
        const ids = unsynced.map((row) => row[pk]);
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`UPDATE ${table} SET synced_at = datetime('now') WHERE ${pk} IN (${placeholders})`).run(...ids);

        console.log(`[Sync] Successfully synced ${unsynced.length} records for ${table}`);
        successCount++;
      }
    } catch (err) {
      console.error(`[Sync] Exception processing table ${table}:`, err.message);
      errorCount++;
    }
  }

  console.log(`[Sync] Completed. Success: ${successCount} tables, Errors: ${errorCount}`);
  return { success: true, successCount, errorCount };
};

module.exports = { syncToSupabase };