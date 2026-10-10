// server/routes/intake.js
// Atomic new student registration
// One SQLite transaction wraps ALL inserts — if anything fails, everything rolls back
//
// Tables touched in order:
//   1. students
//   2. transactions (one row per payment type)
//   3. uniform_sales (one row per uniform item)
//   4. uniform_sizes (decrement quantity)
//   5. receipt_sequence (incremented via receiptService)
//   6. receipt_log (if gap detected)

const express             = require('express');
const router              = express.Router();
const { getDb }           = require('../db/database');
const registrationService = require('../services/registrationService');
const paymentService      = require('../services/paymentService');
const receiptService      = require('../services/receiptService');
const uniformService      = require('../services/uniformService');

const recordStudentPaymentBatch = (regNumber, payments, studentGrade, gradeCode) => {
  return paymentService.recordTransactions(regNumber, payments, studentGrade, gradeCode);
};

// ══════════════════════════════════════════════════════════════
// POST /api/intake/register
// Body shape:
// {
//   first_name, second_name, surname, grade, gender,
//   registration_date, academic_year, term,
//   is_transfer, transfer_date,
//   parent_phone_number, parent_has_whatsapp, whatsapp_contact_name,
//
//   // Fees — each is optional, only include if paid at intake
//   registration_fee_amount,   // numeric
//   registration_fee_paid,     // boolean
//   tuition_fee,               // numeric
//   transport_fee,             // numeric or null
//   relish_fee,                // numeric or null (ECD only)
//   payment_method,            // "cash" | "ecocash" | "bank"
//
//   // Uniforms — array of items sold at intake
//   uniform_items: [
//     { uniform_id, uniform_size_id, size_label, quantity, price }
//   ]
// }
// ══════════════════════════════════════════════════════════════
router.post('/register', (req, res) => {
  const db   = getDb();
  const data = req.body;

  // ── Validate required fields ───────────────────────────────
  const required = ['first_name', 'surname', 'grade', 'gender', 'academic_year', 'term'];
  const missing  = required.filter(f => !data[f]);

  if (missing.length > 0) {
    return res.status(400).json({
      error:   'Missing required fields',
      missing,
    });
  }

  try {
    // ── Wrap everything in one atomic transaction ──────────────
    const processIntake = db.transaction(() => {

      // ── STEP 1: Generate student identifiers ─────────────────
      const registration_number = registrationService.generateRegNumber(
        data.first_name, data.surname, data.grade
      );
      const initials   = registrationService.buildInitials(
        data.first_name, data.second_name, data.surname
      );
      const grade_code = registrationService.getGradeCategory(data.grade);

      // ── STEP 2: Insert student record ─────────────────────────
      db.prepare(`
        INSERT INTO students (
          registration_number, first_name, second_name, surname,
          initials, grade, grade_code, gender,
          status, registration_fee_paid, registration_fee_amount,
          registration_date, is_transfer, transfer_date,
          parent_phone_number, parent_has_whatsapp, whatsapp_contact_name,
          academic_year, synced_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          'active', ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, NULL
        )
      `).run(
        registration_number,
        data.first_name,
        data.second_name  || null,
        data.surname,
        initials,
        data.grade,
        grade_code,
        data.gender,
        data.registration_fee_paid ? 1 : 0,
        data.registration_fee_amount || 0,
        data.registration_date || new Date().toISOString().split('T')[0],
        data.is_transfer ? 1 : 0,
        data.transfer_date || null,
        data.parent_phone_number     || null,
        data.parent_has_whatsapp ? 1 : 0,
        data.whatsapp_contact_name   || null,
        data.academic_year
      );

      // ── STEP 3: Determine which fees are being paid ───────────
      const isECD         = data.grade === 'ECD A' || data.grade === 'ECD B';
      const paymentMethod = data.payment_method || 'cash';
      const term          = data.term;
      const academicYear  = data.academic_year;

      const payments = Array.isArray(data.payments) && data.payments.length > 0
        ? data.payments.map((payment) => ({
            ...payment,
            payment_method: payment.payment_method || paymentMethod,
          }))
        : [];

      // Backwards compatibility: if the frontend does not send a payments array,
      // build the payment rows from legacy fee fields.
      if (payments.length === 0) {
        // Registration fee — always gets its own receipt
        if (data.registration_fee_amount && data.registration_fee_amount > 0) {
          payments.push({
            type:   'tuition', // registration is recorded under tuition type
            amount: data.registration_fee_amount,
            shared: false,
          });
        }

        // Tuition fee
        if (data.tuition_fee && data.tuition_fee > 0) {
          payments.push({
            type:   'tuition',
            amount: data.tuition_fee,
            shared: isECD, // ECD tuition shares receipt with relish
          });
        }

        // Transport fee — always its own receipt
        if (data.transport_fee && data.transport_fee > 0) {
          payments.push({
            type:   'transport',
            amount: data.transport_fee,
            shared: false,
          });
        }

        // Relish fee — ECD only, shares receipt with tuition
        if (data.relish_fee && data.relish_fee > 0) {
          payments.push({
            type:   'relish',
            amount: data.relish_fee,
            shared: isECD,
          });
        }
      }

      // ── STEP 4: Insert transaction rows ───────────────────────
      // Relish shares the primary tuition receipt book only for ECD A/B students.
      const insertTransaction = db.prepare(`
        INSERT INTO transactions (
          registration_number, receipt_number, receipt_book_type, type, amount,
          date, payment_method, term, academic_year,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?, NULL)
      `);

      const usedReceiptNumbers = [];
      const ecdSharedPrimaryTuitionReceipt = { current: null };

      for (const payment of payments) {
        const isECDStudent = data.grade === 'ECD A' || data.grade === 'ECD B';
        const isRelishPayment = payment.type === 'relish';
        const isTuitionPayment = payment.type === 'tuition';

        let receiptBookType = payment.type === 'transport'
          ? 'transport'
          : payment.type === 'uniform'
            ? 'uniform'
            : payment.type === 'other'
              ? 'other'
              : 'primary_tuition';

        let receiptNumber;

        if (isECDStudent && isRelishPayment) {
          if (!ecdSharedPrimaryTuitionReceipt.current) {
            ecdSharedPrimaryTuitionReceipt.current = receiptService.getNextReceipt('primary_tuition').formatted;
          }
          receiptNumber = ecdSharedPrimaryTuitionReceipt.current;
          receiptBookType = 'primary_tuition';
        } else if (isECDStudent && isTuitionPayment) {
          if (!ecdSharedPrimaryTuitionReceipt.current) {
            ecdSharedPrimaryTuitionReceipt.current = receiptService.getNextReceipt('primary_tuition').formatted;
          }
          receiptNumber = ecdSharedPrimaryTuitionReceipt.current;
          receiptBookType = 'primary_tuition';
        } else if (payment.type === 'tuition') {
          receiptBookType = data.grade && data.grade.startsWith('Form') ? 'secondary_tuition' : 'primary_tuition';
          receiptNumber = payment.receipt_number
            ? payment.receipt_number
            : receiptService.getNextReceipt(receiptBookType).formatted;
        } else {
          receiptNumber = payment.receipt_number
            ? payment.receipt_number
            : receiptService.getNextReceipt(receiptBookType).formatted;
        }

        insertTransaction.run(
          registration_number,
          receiptNumber,
          receiptBookType,
          payment.type,
          payment.amount,
          paymentMethod,
          term,
          academicYear
        );

        if (!usedReceiptNumbers.includes(receiptNumber)) {
          usedReceiptNumbers.push(receiptNumber);
        }
      }

      // ── STEP 5: Process uniform sales ─────────────────────────
      const uniformPayments = payments.filter(p => p.type === 'uniform');
      const uniformReceipts = [];

      if (uniformPayments.length > 0) {
        const insertUniformTransaction = db.prepare(`
          INSERT INTO transactions (
            registration_number, receipt_number, receipt_book_type, type, amount,
            date, payment_method, term, academic_year, synced_at
          ) VALUES (?, ?, 'uniform', 'uniform', ?, date('now'), ?, ?, ?, NULL)
        `);

        const insertUniformSale = db.prepare(`
          INSERT INTO uniform_sales (
            uniform_size_id, registration_number,
            transaction_id, quantity_sold, sale_date, synced_at
          ) VALUES (?, ?, ?, ?, date('now'), NULL)
        `);

        for (const payment of uniformPayments) {
          const uniformItems = Array.isArray(payment.uniform_items) ? payment.uniform_items : [];

          for (const item of uniformItems) {
            // Use provided receipt number if available, otherwise generate one in the dedicated uniform book
            let uniformReceipt;
            if (item.receipt_number) {
              uniformReceipt = { formatted: item.receipt_number, raw: parseInt(item.receipt_number) };
            } else {
              uniformReceipt = receiptService.getNextReceipt('uniform');
            }

            // Insert transaction row for this uniform item
            const txResult = insertUniformTransaction.run(
              registration_number,
              uniformReceipt.formatted,
              payment.amount,
              paymentMethod,
              term,
              academicYear
            );

            const transactionId = txResult.lastInsertRowid;

            // Insert uniform sale record (normalized via uniform_size_id)
            insertUniformSale.run(
              item.uniform_size_id,
              registration_number,
              transactionId,
              item.quantity || 1,
            );

            // Decrement stock — throws if insufficient
            const stockResult = uniformService.decrementStock(
              item.uniform_size_id,
              item.quantity || 1
            );

            if (stockResult.changes === 0) {
              throw new Error(
                `Insufficient stock for uniform size ID ${item.uniform_size_id}`
              );
            }

            uniformReceipts.push(uniformReceipt.formatted);
            usedReceiptNumbers.push(uniformReceipt.formatted);
          }
        }
      }

      // ── STEP 6: Return result ─────────────────────────────────
      const totalUniformPaid = uniformPayments.reduce((sum, payment) => {
        const items = Array.isArray(payment.uniform_items) ? payment.uniform_items : [];
        return sum + items.reduce((itemTotal, item) => {
          return itemTotal + ((Number(item.price) || 0) * (Number(item.quantity) || 1));
        }, 0);
      }, 0);

      return {
        registration_number,
        initials,
        grade_code,
        receipt_numbers: usedReceiptNumbers,
        payments_recorded: payments.length + uniformReceipts.length,
        total_paid: [
          data.registration_fee_amount || 0,
          data.tuition_fee || 0,
          data.transport_fee || 0,
          data.relish_fee || 0,
          totalUniformPaid,
        ].reduce((a, b) => a + b, 0),
      };
    });

    // ── Execute the transaction ────────────────────────────────
    const result = processIntake();

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data:    result,
    });

  } catch (err) {
    // SQLite automatically rolls back the entire transaction on any error
    console.error('[Intake] Registration failed:', err.message);

    res.status(400).json({
      success: false,
      error:   err.message,
    });
  }
});

module.exports = router;
module.exports.recordStudentPaymentBatch = recordStudentPaymentBatch;
