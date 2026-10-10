import Database from 'better-sqlite3';
import db from '../db';

/**
 * Generate a registration number for a student.
 * Mirrors the pseudo‑code provided by the user.
 */
export function generateStudentRegistrationNumber(
  firstName: string,
  secondName: string | null,
  surname: string,
  gradeLevel: string
): string {
  // STEP 1: Generate Initials
  const fn = firstName.trim().toUpperCase();
  const sn = secondName?.trim().toUpperCase() ?? '';
  const sur = surname.trim().toUpperCase();
  let initials = fn[0];
  if (sn) {
    initials += sn[0];
  }
  initials += sur[0];

  // STEP 2: Format the Grade/Form Level Code
  const gl = gradeLevel.trim().toUpperCase();
  let gradeCode = '';
  if (gl.includes('ECD A')) {
    gradeCode = 'ECDA';
  } else if (gl.includes('ECD B')) {
    gradeCode = 'ECDB';
  } else if (gl.includes('GRADE')) {
    const num = gl.replace(/[^0-9]/g, '');
    gradeCode = `GD${num}`;
  } else if (gl.includes('FORM')) {
    const num = gl.replace(/[^0-9]/g, '');
    gradeCode = `FM${num}`;
  } else {
    gradeCode = gl.replace(/\s+/g, '');
  }

  // STEP 3: Query the Database for Duplicates (initials + gradeCode)
  const stmt = db.prepare(
    'SELECT COUNT(*) as cnt FROM students WHERE initials = ? AND grade_code = ?'
  );
  const result = stmt.get(initials, gradeCode) as { cnt: number };
  const existingCount = result?.cnt ?? 0;

  const nextSeq = existingCount + 1;
  const formattedSeq = String(nextSeq).padStart(2, '0');

  // STEP 4: Assemble final code
  return `${initials}-${gradeCode}-${formattedSeq}`;
}

/**
 * Add a new student to the DB.
 * Returns the inserted row id.
 */
export function addStudent(
  firstName: string,
  secondName: string | null,
  surname: string,
  gradeLevel: string
): number {
  const registrationNumber = generateStudentRegistrationNumber(
    firstName,
    secondName,
    surname,
    gradeLevel
  );
  // Store initials and grade_code for duplicate checking later
  const fn = firstName.trim().toUpperCase();
  const sn = secondName?.trim().toUpperCase() ?? '';
  const sur = surname.trim().toUpperCase();
  let initials = fn[0];
  if (sn) initials += sn[0];
  initials += sur[0];

  const gl = gradeLevel.trim().toUpperCase();
  let gradeCode = '';
  if (gl.includes('ECD A')) {
    gradeCode = 'ECDA';
  } else if (gl.includes('ECD B')) {
    gradeCode = 'ECDB';
  } else if (gl.includes('GRADE')) {
    const num = gl.replace(/[^0-9]/g, '');
    gradeCode = `GD${num}`;
  } else if (gl.includes('FORM')) {
    const num = gl.replace(/[^0-9]/g, '');
    gradeCode = `FM${num}`;
  } else {
    gradeCode = gl.replace(/\s+/g, '');
  }

  const stmt = db.prepare(
    `INSERT INTO students (first_name, second_name, surname, grade_level, registration_number, initials, grade_code)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    firstName,
    secondName,
    surname,
    gradeLevel,
    registrationNumber,
    initials,
    gradeCode
  );
  return Number(info.lastInsertRowid);
}

export function getStudents() {
  const stmt = db.prepare(
    `SELECT id, first_name, second_name, surname, grade_level, registration_number, created_at FROM students ORDER BY id`
  );
  return stmt.all();
}

export function deleteStudent(id: number) {
  const stmt = db.prepare('DELETE FROM students WHERE id = ?');
  return stmt.run(id);
}
