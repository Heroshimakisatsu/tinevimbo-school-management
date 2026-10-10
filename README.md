# Tinevimbo School Management System

This is the school management application for Tinevimbo School.

## Running the Code

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development servers (Express backend on `:3001` + Vite React frontend on `:5173`):
   ```bash
   npm run dev
   ```

## Architecture & Database

- **Backend Location**: All backend code lives inside the [`server/`](server/) directory.
- **Database**: Embedded SQLite using `better-sqlite3` storing data in `local.db`.
- **Single Source of Truth (SSOT)**:
  - Schema: [`server/db/schema.sql`](server/db/schema.sql) (18 tables including normalized 3NF uniform sales and multiple receipt books).
  - Views: [`server/db/views.sql`](server/db/views.sql)
  - Triggers: [`server/db/triggers.sql`](server/db/triggers.sql)

## Supabase Cloud Sync (FROZEN)

Cloud synchronization to Supabase is **frozen / paused** during this phase of local offline development:
- **`server/supabase/client.js`**: Intentional architectural placeholder for future remote sync.
- **`server/sync/syncToSupabase.js`**: Frozen until Supabase credentials and remote tables are provisioned.
- **`startWatcher()` in `server/index.js`**: Disabled with comment `// startWatcher(); // Disabled to prevent freezing`. Note: This was originally disabled because background connectivity polling caused the Node.js application process to hang/freeze, which is separate from the intentional Supabase freeze. When cloud sync is eventually reconnected, test and debug the watcher for process hangs before re-enabling it.
- **Manual Sync Route (`POST /api/sync/manual` & `POST /api/sync`)**: The "Sync to Cloud" button in the Management UI calls this endpoint. While Supabase is unconfigured/frozen, the route intercepts requests and returns a clean HTTP 503 response (`Cloud sync is currently paused/frozen`), preventing hanging network timeouts or false-positive success toasts.