// server/services/registrationService.js
// Registration number generation and grade utilities

const { getDb } = require('../db/database');

const registrationService = {
  /**
   * Generates a unique registration number based on the Phase 1 spec.
   */
  generateRegNumber: (firstName, surname, grade) => {
    const db = getDb();
    const f = firstName.charAt(0).toUpperCase();
    const s = surname.charAt(0).toUpperCase();
    let base = '';

    if (grade === 'ECD A') {
      base = `${f}ECDA${s}`;
    } else if (grade === 'ECD B') {
      base = `${f}ECDB${s}`;
    } else if (grade.startsWith('Grade')) {
      const num = grade.split(' ')[1];
      base = `${f}GRD${num}${s}`;
    } else if (grade.startsWith('Form')) {
      const num = grade.split(' ')[1];
      base = `${f}FRM${num}${s}`;
    }

    let current = base;
    let counter = 1;

    // Loop until we find a unique registration number
    while (true) {
      const exists = db.prepare('SELECT registration_number FROM students WHERE registration_number = ?').get(current);
      if (!exists) return current;
      
      current = `${base}${counter}`;
      counter++;
    }
  },

  /**
   * Maps a grade to its database category code.
   */
  getGradeCategory: (grade) => {
    if (['ECD A', 'ECD B', 'Grade 1', 'Grade 2'].includes(grade)) return 'ecd-grade2';
    if (['Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(grade)) return 'grade3-7';
    if (['Form 1', 'Form 2', 'Form 3', 'Form 4'].includes(grade)) return 'form1-4';
    if (['Form 5', 'Form 6'].includes(grade)) return 'form5-6';
    return 'unknown';
  },

  /**
   * Builds standardized initials (e.g., "I.C." or "I.M.C.")
   */
  buildInitials: (firstName, secondName, surname) => {
    let initials = `${firstName.charAt(0).toUpperCase()}.`;
    if (secondName && secondName.trim() !== '') {
      initials += `${secondName.charAt(0).toUpperCase()}.`;
    }
    initials += `${surname.charAt(0).toUpperCase()}.`;
    return initials;
  },

  /**
   * Determines the next grade for annual batch promotions.
   */
  getNextGrade: (currentGrade) => {
    const promotionMap = {
      'ECD A': 'ECD B',
      'ECD B': 'Grade 1',
      'Grade 1': 'Grade 2',
      'Grade 2': 'Grade 3',
      'Grade 3': 'Grade 4',
      'Grade 4': 'Grade 5',
      'Grade 5': 'Grade 6',
      'Grade 6': 'Grade 7',
      'Grade 7': 'Form 1',
      'Form 1': 'Form 2',
      'Form 2': 'Form 3',
      'Form 3': 'Form 4',
      'Form 4': 'Form 5',
      'Form 5': 'Form 6',
      'Form 6': 'graduated'
    };
    return promotionMap[currentGrade] || null;
  }
};

module.exports = registrationService;
