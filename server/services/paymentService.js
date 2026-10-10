// server/services/paymentService.js
// Payment recording logic with ECD receipt-sharing rule and receipt book types

const { getDb } = require('../db/database');
const receiptService = require('./receiptService');

const paymentService = {
  /**
   * Determines the receipt book type based on payment type and student grade
   */
  getReceiptBookType: (paymentType, gradeCode, studentGrade = null) => {
    if (paymentType === 'transport') return 'transport';
    if (paymentType === 'relish') {
      if (studentGrade === 'ECD A' || studentGrade === 'ECD B') return 'primary_tuition';
      throw new Error('Relish is only allowed for ECD A/B students.');
    }
    if (paymentType === 'tuition') {
      const isPrimaryTuitionGrade = studentGrade === 'ECD A' || studentGrade === 'ECD B' ||
        ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(studentGrade || '');
      if (isPrimaryTuitionGrade) return 'primary_tuition';
      return gradeCode && gradeCode.startsWith('form') ? 'secondary_tuition' : 'primary_tuition';
    }
    if (paymentType === 'uniform') return 'uniform';
    return 'other';
  },

  /**
   * Records a batch of payments for a single student.
   * Handles the specific ECD receipt-sharing rule and receipt book types.
   */
  recordTransactions: (regNumber, payments, studentGrade, gradeCode) => {
    const db = getDb();
    return db.transaction((txPayments) => {
      const results = [];

      const isECD = studentGrade === 'ECD A' || studentGrade === 'ECD B';
      const filteredPayments = txPayments.filter(payment => {
        if (payment.type === 'relish' && !isECD) {
          throw new Error('Relish is only allowed for ECD A/B students.');
        }
        return true;
      });

      const insertStmt = db.prepare(`
        INSERT INTO transactions (
          registration_number, receipt_number, receipt_book_type, type, amount, date, 
          payment_method, term, academic_year, other_payment_name, synced_at
        ) VALUES (?, ?, ?, ?, ?, date('now'), ?, ?, ?, ?, NULL)
      `);

      let sharedECDPrimaryReceipt = null;

      for (const payment of filteredPayments) {
        const isECDReceiptPayment = isECD && (payment.type === 'tuition' || payment.type === 'relish');

        if (isECDReceiptPayment) {
          if (!sharedECDPrimaryReceipt) {
            sharedECDPrimaryReceipt = payment.receipt_number
              ? payment.receipt_number
              : receiptService.getNextReceipt('primary_tuition').formatted;
          }

          const receiptNum = payment.receipt_number || sharedECDPrimaryReceipt;
          const receiptBookType = 'primary_tuition';

          insertStmt.run(
            regNumber,
            receiptNum,
            receiptBookType,
            payment.type,
            payment.amount,
            payment.payment_method || 'cash',
            payment.term,
            payment.academic_year,
            payment.other_payment_name || null
          );

          results.push({ type: payment.type, receipt_number: receiptNum, amount: payment.amount, receipt_book_type: receiptBookType });
          continue;
        }

        const receiptBookType = paymentService.getReceiptBookType(payment.type, gradeCode, studentGrade);
        const receiptNum = payment.receipt_number
          ? payment.receipt_number
          : receiptService.getNextReceipt(receiptBookType).formatted;

        insertStmt.run(
          regNumber,
          receiptNum,
          receiptBookType,
          payment.type,
          payment.amount,
          payment.payment_method || 'cash',
          payment.term,
          payment.academic_year,
          payment.other_payment_name || null
        );

        results.push({ type: payment.type, receipt_number: receiptNum, amount: payment.amount, receipt_book_type: receiptBookType });
      }
      return results;
    })(payments);
  },

  /**
   * Retrieves full transaction history for a student.
   */
  getHistory: (regNumber) => {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM transactions 
      WHERE registration_number = ? 
      ORDER BY date DESC, id DESC
    `).all(regNumber);
  },

  /**
   * Calculates expected vs paid fees for a specific term.
   */
  getOutstanding: (regNumber, term, academicYear) => {
    const db = getDb();
    const student = db.prepare('SELECT grade, grade_code FROM students WHERE registration_number = ?').get(regNumber);
    if (!student) throw new Error('Student not found');

    const fees = db.prepare(`
      SELECT * FROM term_fees 
      WHERE grade = ? AND term = ? AND academic_year = ?
    `).get(student.grade, term, academicYear);
    
    if (!fees) return { error: 'Fee structure not set for this term/grade combination' };

    const payments = db.prepare(`
      SELECT type, SUM(amount) as total 
      FROM transactions 
      WHERE registration_number = ? AND term = ? AND academic_year = ? 
      GROUP BY type
    `).all(regNumber, term, academicYear);
    
    const paidMap = payments.reduce((acc, p) => ({ ...acc, [p.type]: p.total }), {});
    const isECD = student.grade === 'ECD A' || student.grade === 'ECD B';

    return {
      tuition: { 
        expected: fees.tuition_fee, 
        paid: paidMap.tuition || 0, 
        balance: fees.tuition_fee - (paidMap.tuition || 0) 
      },
      transport: { 
        expected: fees.transport_fee || 0, 
        paid: paidMap.transport || 0, 
        balance: (fees.transport_fee || 0) - (paidMap.transport || 0) 
      },
      relish: {
        expected: isECD ? (fees.relish_fee || 0) : 0,
        paid: isECD ? (paidMap.relish || 0) : 0,
        balance: isECD ? ((fees.relish_fee || 0) - (paidMap.relish || 0)) : 0
      }
    };
  }
};

module.exports = paymentService;
