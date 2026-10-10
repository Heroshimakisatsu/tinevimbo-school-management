// server/services/receiptService.js
// Receipt number generation and gap detection for multiple receipt books

const { getDb } = require('../db/database');

const VALID_RECEIPT_BOOK_TYPES = [
  'secondary_tuition',
  'primary_tuition',
  'transport',
  'uniform',
  'other'
];

const normalizeReceiptBookType = (type) => {
  if (!type) return 'primary_tuition';
  const normalized = String(type).trim().toLowerCase();
  if (VALID_RECEIPT_BOOK_TYPES.includes(normalized)) {
    return normalized;
  }
  if (normalized === 'tuition') {
    throw new Error('Ambiguous receipt book type "tuition". Specify "primary_tuition" or "secondary_tuition".');
  }
  if (normalized === 'relish') {
    // Under ECD rules, relish payments share the primary tuition receipt book
    return 'primary_tuition';
  }
  throw new Error(`Invalid receipt_book_type: "${type}". Allowed types: ${VALID_RECEIPT_BOOK_TYPES.join(', ')}`);
};

const receiptService = {
  VALID_RECEIPT_BOOK_TYPES,
  normalizeReceiptBookType,

  /**
   * Zero-pads the receipt number to 4 digits.
   */
  formatReceipt: (number) => {
    return number.toString().padStart(4, '0');
  },

  /**
   * Get the appropriate receipt sequence table name based on book type.
   * Validates and maps the receipt book type strictly.
   */
  getSequenceTable: (receiptBookType) => {
    const validBookType = normalizeReceiptBookType(receiptBookType);
    const tables = {
      'secondary_tuition': 'receipt_sequence_secondary_tuition',
      'primary_tuition': 'receipt_sequence_primary_tuition',
      'transport': 'receipt_sequence_transport',
      'uniform': 'receipt_sequence_uniform',
      'other': 'receipt_sequence_other'
    };
    return tables[validBookType];
  },

  /**
   * Increments and fetches the next available receipt number for a specific book type.
   */
  getNextReceipt: (receiptBookType = 'primary_tuition') => {
    const db = getDb();
    const tableName = receiptService.getSequenceTable(receiptBookType);
    
    // Ensure the sequence table has a row
    db.prepare(`INSERT OR IGNORE INTO ${tableName} (id, last_receipt_number) VALUES (1, 0)`).run();
    
    const stmt = db.prepare(`
      UPDATE ${tableName} 
      SET last_receipt_number = last_receipt_number + 1, 
          last_updated_at = datetime('now') 
      WHERE id = 1 
      RETURNING last_receipt_number
    `);
    const row = stmt.get();
    return { 
      raw: row.last_receipt_number, 
      formatted: receiptService.formatReceipt(row.last_receipt_number) 
    };
  },

  /**
   * Set a specific receipt number (for manual override)
   */
  setReceiptNumber: (receiptBookType, number) => {
    const db = getDb();
    const tableName = receiptService.getSequenceTable(receiptBookType);
    
    // Ensure the sequence table has a row
    db.prepare(`INSERT OR IGNORE INTO ${tableName} (id, last_receipt_number) VALUES (1, 0)`).run();
    
    db.prepare(`
      UPDATE ${tableName} 
      SET last_receipt_number = ?, 
          last_updated_at = datetime('now') 
      WHERE id = 1
    `).run(number);
  },

  /**
   * Get the current last receipt number for a book type
   */
  getCurrentReceipt: (receiptBookType = 'primary_tuition') => {
    const db = getDb();
    const tableName = receiptService.getSequenceTable(receiptBookType);
    
    // Ensure the sequence table has a row
    db.prepare(`INSERT OR IGNORE INTO ${tableName} (id, last_receipt_number) VALUES (1, 0)`).run();
    
    const row = db.prepare(`SELECT last_receipt_number FROM ${tableName} WHERE id = 1`).get();
    return row ? row.last_receipt_number : 0;
  },

  /**
   * Analyzes manual user input to detect skipped or spoiled receipts.
   */
  detectGap: (receiptBookType, actualNumber) => {
    const db = getDb();
    const tableName = receiptService.getSequenceTable(receiptBookType);
    
    // Ensure the sequence table has a row
    db.prepare(`INSERT OR IGNORE INTO ${tableName} (id, last_receipt_number) VALUES (1, 0)`).run();
    
    const row = db.prepare(`SELECT last_receipt_number FROM ${tableName} WHERE id = 1`).get();
    const expected = row.last_receipt_number + 1;
    const gap = actualNumber - expected;

    let alertLevel = 'normal';
    if (gap === 1) alertLevel = 'normal'; // Next sequential input
    else if (gap === 2 || gap === 3) alertLevel = 'warning'; // 1-2 receipts spoiled
    else if (gap >= 4) alertLevel = 'high_alert'; // Critical

    return { expected, actual: actualNumber, gap, alertLevel };
  },

  /**
   * Logs identified gaps for security and auditing.
   */
  logGap: (receiptBookType, expected, actual, gap, alertLevel, reason = null) => {
    const validBookType = normalizeReceiptBookType(receiptBookType);
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO receipt_log (receipt_book_type, expected_receipt_number, actual_receipt_number, gap, alert_level, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(validBookType, expected, actual, gap, alertLevel, reason);
  }
};

module.exports = receiptService;
