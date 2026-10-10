const express = require('express');
const router = express.Router();
const { syncToSupabase } = require('../sync/syncToSupabase');

const handleSync = async (req, res) => {
  // Guard against placeholder / unconfigured credentials during frozen offline development
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || url.includes('your-project-ref') || !key || key.includes('your-anon-key')) {
    return res.status(503).json({
      success: false,
      error: 'Cloud sync is currently paused/frozen: Supabase credentials are not configured.',
    });
  }

  try {
    const result = await syncToSupabase();
    if (result.errorCount > 0 && result.successCount === 0) {
      return res.status(502).json({
        success: false,
        error: `Sync failed for all ${result.errorCount} tables.`,
        details: result,
      });
    }
    res.json({
      success: true,
      message: `Manual sync completed (${result.successCount} synced, ${result.errorCount} errors)`,
      details: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Support both POST /api/sync/manual and POST /api/sync
router.post('/manual', handleSync);
router.post('/', handleSync);

module.exports = router;