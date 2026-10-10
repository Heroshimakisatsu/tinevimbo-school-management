const { syncToSupabase } = require('./syncToSupabase');

let isSyncing = false;

const checkOnlineAndSync = async () => {
  if (isSyncing) return;

  try {
    const response = await fetch('https://1.1.1.1', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      isSyncing = true;
      await syncToSupabase();
      isSyncing = false;
    }
  } catch (_error) {
    // Offline or network failure; silently retry on the next cycle.
  }
};

const startWatcher = () => {
  console.log('[Watcher] Starting auto-sync watcher (interval: 30s)...');
  checkOnlineAndSync();
  setInterval(checkOnlineAndSync, 30 * 1000);
};

module.exports = { startWatcher };