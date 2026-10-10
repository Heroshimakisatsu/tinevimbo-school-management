// server/supabase/client.js
// FROZEN: Supabase sync paused until reconnect. Known intentional placeholder.
// Supabase client initialisation for the backend sync service
// Credentials loaded from environment variables

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  // Use the service key (not anon key) for backend sync
  // This bypasses RLS so the sync can write to all tables

let supabase = null;

const getSupabaseClient = () => {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn('[Supabase] Missing credentials — sync will be disabled.');
      console.warn('[Supabase] Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
      return null;
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    });

    console.log('[Supabase] Client initialised.');
  }

  return supabase;
};

const isSupabaseConfigured = () => {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);
};

module.exports = { getSupabaseClient, isSupabaseConfigured };
