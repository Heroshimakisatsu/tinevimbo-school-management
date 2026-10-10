// server/routes/receipts.js
// Receipt number management routes

const express = require('express');
const router = express.Router();
const receiptService = require('../services/receiptService');

// GET /api/receipts/current
// Get current receipt numbers for all receipt book types
router.get('/current', (req, res) => {
  try {
    const secondaryTuition = receiptService.getCurrentReceipt('secondary_tuition');
    const primaryTuition = receiptService.getCurrentReceipt('primary_tuition');
    const transport = receiptService.getCurrentReceipt('transport');
    const relish = receiptService.getCurrentReceipt('relish');
    const uniform = receiptService.getCurrentReceipt('uniform');
    const other = receiptService.getCurrentReceipt('other');

    const buildReceiptInfo = (current) => ({
      current,
      next: current + 1,
      formatted: receiptService.formatReceipt(current + 1)
    });

    res.json({
      secondary_tuition: buildReceiptInfo(secondaryTuition),
      primary_tuition: buildReceiptInfo(primaryTuition),
      transport: buildReceiptInfo(transport),
      relish: buildReceiptInfo(relish),
      uniform: buildReceiptInfo(uniform),
      other: buildReceiptInfo(other)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
