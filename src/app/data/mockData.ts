// Mock Data for Tinevimbo School Management System
// Zimbabwean-localized dummy data

export interface Student {
  id: string;
  registrationNumber: string;
  name: string;
  grade: string;
  registrationFeePaid: boolean;
  registrationFeeAmount: number;
  registrationDate: string;
  isTransfer: boolean;
  previousSchool?: string;
  status: 'active' | 'transferred';
  transferDate?: string;
  daysJoined: number;
  parentPhoneNumber: string;
  parentHasWhatsApp: boolean;
  whatsappContactName: string;
}

export interface Transaction {
  id: string;
  receiptNumber: number;
  studentId?: string;
  registrationNumber?: string;
  studentName: string;
  studentGrade: string;
  type: 'tuition' | 'uniform' | 'relish' | 'other';
  otherPaymentName?: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'ecocash' | 'bank';
  uniformSize?: 'S' | 'M' | 'L' | 'XL';
  notes?: string;
}

export interface Expense {
  id: string;
  category: 'wifi' | 'salaries' | 'utilities' | 'supplies' | 'maintenance' | 'other';
  description: string;
  amount: number;
  date: string;
  budgetLimit?: number;
}

export const mockStudents: Student[] = [
  // ECD Students
  {
    id: 's1',
    registrationNumber: 'REG001',
    name: 'Tanaka Moyo',
    grade: 'Form 4',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-15',
    isTransfer: false,
    status: 'active',
    daysJoined: 26,
    parentPhoneNumber: '+263 771 234 567',
    parentHasWhatsApp: true,
    whatsappContactName: 'TanakaMoyo_Form4',
  },
  {
    id: 's2',
    registrationNumber: 'REG002',
    name: 'Sarah Sibanda',
    grade: 'Form 3',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-02-01',
    isTransfer: false,
    status: 'active',
    daysJoined: 9,
    parentPhoneNumber: '+263 712 345 678',
    parentHasWhatsApp: false,
    whatsappContactName: 'SarahSibanda_Form3',
  },
  {
    id: 's3',
    registrationNumber: 'REG003',
    name: 'Tafadzwa Chikwanha',
    grade: 'Form 2',
    registrationFeePaid: false,
    registrationFeeAmount: 20,
    registrationDate: '2026-02-08',
    isTransfer: true,
    previousSchool: 'St. Peters High',
    status: 'active',
    daysJoined: 2,
    parentPhoneNumber: '+263 733 456 789',
    parentHasWhatsApp: true,
    whatsappContactName: 'TafadzwaChikwanha_Form2',
  },
  {
    id: 's4',
    registrationNumber: 'REG004',
    name: 'Ruvimbo Ncube',
    grade: 'Form 4',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-20',
    isTransfer: false,
    status: 'active',
    daysJoined: 21,
    parentPhoneNumber: '+263 774 567 890',
    parentHasWhatsApp: true,
    whatsappContactName: 'RuvimboNcube_Form4',
  },
  {
    id: 's5',
    registrationNumber: 'REG005',
    name: 'Kudakwashe Mabasa',
    grade: 'Form 1',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-02-05',
    isTransfer: false,
    status: 'active',
    daysJoined: 5,
    parentPhoneNumber: '+263 715 678 901',
    parentHasWhatsApp: false,
    whatsappContactName: 'KudakwasheMabasa_Form1',
  },
  {
    id: 's6',
    registrationNumber: 'REG006',
    name: 'Chipo Dube',
    grade: 'Form 3',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2025-11-20',
    isTransfer: false,
    status: 'transferred',
    transferDate: '2025-12-15',
    daysJoined: 82,
    parentPhoneNumber: '+263 726 789 012',
    parentHasWhatsApp: true,
    whatsappContactName: 'ChipoDube_Form3',
  },
  // ECD A Students
  {
    id: 's7',
    registrationNumber: 'REG007',
    name: 'Tendai Moyo',
    grade: 'ECD A',
    registrationFeePaid: true,
    registrationFeeAmount: 15,
    registrationDate: '2026-01-10',
    isTransfer: false,
    status: 'active',
    daysJoined: 31,
    parentPhoneNumber: '+263 777 123 456',
    parentHasWhatsApp: true,
    whatsappContactName: 'TendaiMoyo_ECDA',
  },
  {
    id: 's8',
    registrationNumber: 'REG008',
    name: 'Anita Kadzere',
    grade: 'ECD A',
    registrationFeePaid: true,
    registrationFeeAmount: 15,
    registrationDate: '2026-01-25',
    isTransfer: false,
    status: 'active',
    daysJoined: 16,
    parentPhoneNumber: '+263 778 234 567',
    parentHasWhatsApp: false,
    whatsappContactName: 'AnitaKadzere_ECDA',
  },
  {
    id: 's9',
    registrationNumber: 'REG009',
    name: 'Blessing Chiweshe',
    grade: 'ECD A',
    registrationFeePaid: false,
    registrationFeeAmount: 15,
    registrationDate: '2026-02-03',
    isTransfer: false,
    status: 'active',
    daysJoined: 7,
    parentPhoneNumber: '+263 779 345 678',
    parentHasWhatsApp: true,
    whatsappContactName: 'BlessingChiweshe_ECDA',
  },
  // ECD B Students
  {
    id: 's10',
    registrationNumber: 'REG010',
    name: 'Grace Mhlanga',
    grade: 'ECD B',
    registrationFeePaid: true,
    registrationFeeAmount: 15,
    registrationDate: '2026-01-12',
    isTransfer: false,
    status: 'active',
    daysJoined: 29,
    parentPhoneNumber: '+263 770 456 789',
    parentHasWhatsApp: true,
    whatsappContactName: 'GraceMhlanga_ECDB',
  },
  {
    id: 's11',
    registrationNumber: 'REG011',
    name: 'Peter Zvobgo',
    grade: 'ECD B',
    registrationFeePaid: true,
    registrationFeeAmount: 15,
    registrationDate: '2026-01-28',
    isTransfer: false,
    status: 'active',
    daysJoined: 13,
    parentPhoneNumber: '+263 771 567 890',
    parentHasWhatsApp: false,
    whatsappContactName: 'PeterZvobgo_ECDB',
  },
  {
    id: 's12',
    registrationNumber: 'REG012',
    name: 'Rachel Moyo',
    grade: 'ECD B',
    registrationFeePaid: true,
    registrationFeeAmount: 15,
    registrationDate: '2026-02-07',
    isTransfer: false,
    status: 'active',
    daysJoined: 3,
    parentPhoneNumber: '+263 772 678 901',
    parentHasWhatsApp: true,
    whatsappContactName: 'RachelMoyo_ECDB',
  },
  // Primary Grades
  {
    id: 's13',
    registrationNumber: 'REG013',
    name: 'John Mufunde',
    grade: 'Grade 1',
    registrationFeePaid: true,
    registrationFeeAmount: 18,
    registrationDate: '2026-01-08',
    isTransfer: false,
    status: 'active',
    daysJoined: 33,
    parentPhoneNumber: '+263 773 789 012',
    parentHasWhatsApp: true,
    whatsappContactName: 'JohnMufunde_Grade1',
  },
  {
    id: 's14',
    registrationNumber: 'REG014',
    name: 'Miriam Gondo',
    grade: 'Grade 2',
    registrationFeePaid: true,
    registrationFeeAmount: 18,
    registrationDate: '2026-01-18',
    isTransfer: false,
    status: 'active',
    daysJoined: 23,
    parentPhoneNumber: '+263 774 890 123',
    parentHasWhatsApp: false,
    whatsappContactName: 'MiriamGondo_Grade2',
  },
  {
    id: 's15',
    registrationNumber: 'REG015',
    name: 'David Chikowore',
    grade: 'Grade 3',
    registrationFeePaid: false,
    registrationFeeAmount: 18,
    registrationDate: '2026-02-01',
    isTransfer: false,
    status: 'active',
    daysJoined: 9,
    parentPhoneNumber: '+263 775 901 234',
    parentHasWhatsApp: true,
    whatsappContactName: 'DavidChikowore_Grade3',
  },
  {
    id: 's16',
    registrationNumber: 'REG016',
    name: 'Susan Matanga',
    grade: 'Grade 4',
    registrationFeePaid: true,
    registrationFeeAmount: 18,
    registrationDate: '2026-01-22',
    isTransfer: false,
    status: 'active',
    daysJoined: 19,
    parentPhoneNumber: '+263 776 012 345',
    parentHasWhatsApp: true,
    whatsappContactName: 'SusanMatanga_Grade4',
  },
  {
    id: 's17',
    registrationNumber: 'REG017',
    name: 'Michael Banda',
    grade: 'Grade 5',
    registrationFeePaid: true,
    registrationFeeAmount: 18,
    registrationDate: '2026-01-15',
    isTransfer: false,
    status: 'active',
    daysJoined: 26,
    parentPhoneNumber: '+263 777 123 456',
    parentHasWhatsApp: false,
    whatsappContactName: 'MichaelBanda_Grade5',
  },
  {
    id: 's18',
    registrationNumber: 'REG018',
    name: 'Patience Moyo',
    grade: 'Grade 6',
    registrationFeePaid: true,
    registrationFeeAmount: 18,
    registrationDate: '2026-01-30',
    isTransfer: false,
    status: 'active',
    daysJoined: 11,
    parentPhoneNumber: '+263 778 234 567',
    parentHasWhatsApp: true,
    whatsappContactName: 'PatienceMoyo_Grade6',
  },
  {
    id: 's19',
    registrationNumber: 'REG019',
    name: 'Tawanda Mhlanga',
    grade: 'Grade 7',
    registrationFeePaid: false,
    registrationFeeAmount: 18,
    registrationDate: '2026-02-06',
    isTransfer: false,
    status: 'active',
    daysJoined: 4,
    parentPhoneNumber: '+263 779 345 678',
    parentHasWhatsApp: true,
    whatsappContactName: 'TawandaMhlanga_Grade7',
  },
  // Additional Forms
  {
    id: 's20',
    registrationNumber: 'REG020',
    name: 'Lisa Makoni',
    grade: 'Form 1',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-25',
    isTransfer: false,
    status: 'active',
    daysJoined: 16,
    parentPhoneNumber: '+263 770 456 789',
    parentHasWhatsApp: true,
    whatsappContactName: 'LisaMakoni_Form1',
  },
  {
    id: 's21',
    registrationNumber: 'REG021',
    name: 'Samuel Chidziva',
    grade: 'Form 2',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-20',
    isTransfer: false,
    status: 'active',
    daysJoined: 21,
    parentPhoneNumber: '+263 771 567 890',
    parentHasWhatsApp: false,
    whatsappContactName: 'SamuelChidziva_Form2',
  },
  {
    id: 's22',
    registrationNumber: 'REG022',
    name: 'Nyaradzai Moyo',
    grade: 'Form 4',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-02-02',
    isTransfer: false,
    status: 'active',
    daysJoined: 8,
    parentPhoneNumber: '+263 772 678 901',
    parentHasWhatsApp: true,
    whatsappContactName: 'NyaradzaiMoyo_Form4',
  },
  {
    id: 's23',
    registrationNumber: 'REG023',
    name: 'Tinotenda Kufa',
    grade: 'Form 5',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-18',
    isTransfer: false,
    status: 'active',
    daysJoined: 23,
    parentPhoneNumber: '+263 773 789 012',
    parentHasWhatsApp: false,
    whatsappContactName: 'TinotendaKufa_Form5',
  },
  {
    id: 's24',
    registrationNumber: 'REG024',
    name: 'Pride Moyo',
    grade: 'Form 5',
    registrationFeePaid: false,
    registrationFeeAmount: 20,
    registrationDate: '2026-02-04',
    isTransfer: true,
    previousSchool: 'Harare High',
    status: 'active',
    daysJoined: 6,
    parentPhoneNumber: '+263 774 890 123',
    parentHasWhatsApp: true,
    whatsappContactName: 'PrideMoyo_Form5',
  },
  {
    id: 's25',
    registrationNumber: 'REG025',
    name: 'Grace Chikowore',
    grade: 'Form 6',
    registrationFeePaid: true,
    registrationFeeAmount: 20,
    registrationDate: '2026-01-22',
    isTransfer: false,
    status: 'active',
    daysJoined: 19,
    parentPhoneNumber: '+263 775 901 234',
    parentHasWhatsApp: true,
    whatsappContactName: 'GraceChikowore_Form6',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    receiptNumber: 1001,
    studentId: 's1',
    registrationNumber: 'REG001',
    studentName: 'Tanaka Moyo',
    studentGrade: 'Form 4',
    type: 'tuition',
    amount: 150,
    date: '2026-02-10',
    paymentMethod: 'ecocash',
  },
  {
    id: 't2',
    receiptNumber: 1002,
    studentId: 's2',
    registrationNumber: 'REG002',
    studentName: 'Sarah Sibanda',
    studentGrade: 'Form 3',
    type: 'uniform',
    amount: 45,
    date: '2026-02-09',
    paymentMethod: 'cash',
    uniformSize: 'M',
  },
  {
    id: 't3',
    receiptNumber: 1003,
    studentId: 's3',
    registrationNumber: 'REG003',
    studentName: 'Tafadzwa Chikwanha',
    studentGrade: 'Form 2',
    type: 'relish',
    amount: 20,
    date: '2026-02-08',
    paymentMethod: 'ecocash',
  },
  {
    id: 't4',
    receiptNumber: 1004,
    studentId: 's4',
    registrationNumber: 'REG004',
    studentName: 'Ruvimbo Ncube',
    studentGrade: 'Form 4',
    type: 'tuition',
    amount: 150,
    date: '2026-02-07',
    paymentMethod: 'bank',
  },
  {
    id: 't5',
    receiptNumber: 1005,
    studentId: 's1',
    registrationNumber: 'REG001',
    studentName: 'Tanaka Moyo',
    studentGrade: 'Form 4',
    type: 'uniform',
    amount: 45,
    date: '2026-02-06',
    paymentMethod: 'cash',
    uniformSize: 'L',
  },
  {
    id: 't6',
    receiptNumber: 1006,
    studentId: 's5',
    registrationNumber: 'REG005',
    studentName: 'Kudakwashe Mabasa',
    studentGrade: 'Form 1',
    type: 'tuition',
    amount: 150,
    date: '2026-02-05',
    paymentMethod: 'ecocash',
  },
  {
    id: 't7',
    receiptNumber: 1007,
    studentId: 's2',
    registrationNumber: 'REG002',
    studentName: 'Sarah Sibanda',
    studentGrade: 'Form 3',
    type: 'other',
    otherPaymentName: 'Sports Fee',
    amount: 25,
    date: '2026-02-04',
    paymentMethod: 'ecocash',
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    category: 'wifi',
    description: 'Monthly Internet - TelOne',
    amount: 80,
    date: '2026-02-01',
    budgetLimit: 100,
  },
  {
    id: 'e2',
    category: 'salaries',
    description: 'Teacher Salaries - February',
    amount: 2400,
    date: '2026-02-01',
    budgetLimit: 3000,
  },
  {
    id: 'e3',
    category: 'utilities',
    description: 'ZESA Bill',
    amount: 150,
    date: '2026-02-05',
    budgetLimit: 200,
  },
  {
    id: 'e4',
    category: 'supplies',
    description: 'Textbooks and Stationery',
    amount: 320,
    date: '2026-02-07',
    budgetLimit: 400,
  },
  {
    id: 'e5',
    category: 'maintenance',
    description: 'Classroom Repairs',
    amount: 180,
    date: '2026-02-08',
    budgetLimit: 200,
  },
];

// Calculate grade distribution
export const calculateGradeDistribution = () => {
  const activeStudents = mockStudents.filter(s => s.status === 'active');
  
  const gradeDistribution = {
    'ECD A': 0,
    'ECD B': 0,
    'Grade 1': 0,
    'Grade 2': 0,
    'Grade 3': 0,
    'Grade 4': 0,
    'Grade 5': 0,
    'Grade 6': 0,
    'Grade 7': 0,
    'Form 1': 0,
    'Form 2': 0,
    'Form 3': 0,
    'Form 4': 0,
    'Form 5': 0,
    'Form 6': 0,
  };

  activeStudents.forEach(student => {
    if (gradeDistribution.hasOwnProperty(student.grade)) {
      gradeDistribution[student.grade as keyof typeof gradeDistribution]++;
    }
  });

  return gradeDistribution;
};

// Calculate grade distribution with old and new students
export const calculateGradeDistributionWithNewStudents = () => {
  const activeStudents = mockStudents.filter(s => s.status === 'active');
  
  const gradeDistribution = {
    'ECD A': { old: 0, new: 0 },
    'ECD B': { old: 0, new: 0 },
    'Grade 1': { old: 0, new: 0 },
    'Grade 2': { old: 0, new: 0 },
    'Grade 3': { old: 0, new: 0 },
    'Grade 4': { old: 0, new: 0 },
    'Grade 5': { old: 0, new: 0 },
    'Grade 6': { old: 0, new: 0 },
    'Grade 7': { old: 0, new: 0 },
    'Form 1': { old: 0, new: 0 },
    'Form 2': { old: 0, new: 0 },
    'Form 3': { old: 0, new: 0 },
    'Form 4': { old: 0, new: 0 },
    'Form 5': { old: 0, new: 0 },
    'Form 6': { old: 0, new: 0 },
  };

  activeStudents.forEach(student => {
    if (gradeDistribution.hasOwnProperty(student.grade)) {
      const isNewStudent = student.daysJoined <= 14; // Students joined in last 14 days are considered new
      if (isNewStudent) {
        gradeDistribution[student.grade as keyof typeof gradeDistribution].new++;
      } else {
        gradeDistribution[student.grade as keyof typeof gradeDistribution].old++;
      }
    }
  });

  return gradeDistribution;
};

// Calculate student statistics by category
export const calculateStudentStatistics = () => {
  const activeStudents = mockStudents.filter(s => s.status === 'active');
  const currentDate = new Date('2026-02-10');
  
  const stats: Record<string, { total: number; new: number; monthOld: number; weekOld: number }> = {
    'ECD': { total: 0, new: 0, monthOld: 0, weekOld: 0 },
    'Primary School': { total: 0, new: 0, monthOld: 0, weekOld: 0 },
    'Forms': { total: 0, new: 0, monthOld: 0, weekOld: 0 }
  };

  activeStudents.forEach(student => {
    const isNewStudent = student.daysJoined <= 14;
    const daysJoined = student.daysJoined;
    
    let category: string = '';
    if (student.grade.includes('ECD')) {
      category = 'ECD';
    } else if (student.grade.includes('Grade')) {
      category = 'Primary School';
    } else if (student.grade.includes('Form')) {
      category = 'Forms';
    }

    if (stats[category]) {
      stats[category].total++;
      if (isNewStudent) {
        stats[category].new++;
      } else {
        if (daysJoined > 30) {
          stats[category].monthOld++;
        } else {
          stats[category].weekOld++;
        }
      }
    }
  });

  return stats;
};

// Calculate daily summary for table
export const calculateDailySummary = (dateOffset = 0) => {
  const today = new Date('2026-02-10');
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - dateOffset);
  const dateStr = targetDate.toISOString().split('T')[0];

  const activeStudents = mockStudents.filter(s => s.status === 'active');
  
  // Calculate primary fees (ECD A, ECD B, Grade 1-2)
  const primaryGrades = ['ECD A', 'ECD B', 'Grade 1', 'Grade 2'];
  const primaryStudents = activeStudents.filter(s => primaryGrades.includes(s.grade));
  const primaryFees = primaryStudents.reduce((sum, s) => sum + s.registrationFeeAmount, 0);

  // Calculate secondary fees (Grade 3-7, Form 1-6)
  const secondaryStudents = activeStudents.filter(s => !primaryGrades.includes(s.grade));
  const secondaryFees = secondaryStudents.reduce((sum, s) => sum + s.registrationFeeAmount, 0);

  // Calculate transport fees (mock data with some variation)
  const transportFees = Math.floor(Math.random() * 200) + 100; // $100-300

  // Calculate uniform fees from transactions
  const uniformTransactions = mockTransactions.filter(t => 
    t.type === 'uniform' && t.date === dateStr
  );
  const uniformFees = uniformTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate daily expenses
  const dailyExpenses = mockExpenses
    .filter(e => e.date === dateStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate total income and profit
  const totalIncome = primaryFees + secondaryFees + transportFees + uniformFees;
  const profit = totalIncome - dailyExpenses;

  return {
    date: dateStr,
    primaryFees,
    secondaryFees,
    transportFees,
    uniformFees,
    totalExpenses: dailyExpenses,
    totalIncome,
    profit,
  };
};

// Calculate daily fee breakdowns
export const calculateDailyFeeBreakdown = (dateOffset = 0) => {
  const today = new Date('2026-02-10');
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - dateOffset);
  const dateStr = targetDate.toISOString().split('T')[0];

  const activeStudents = mockStudents.filter(s => s.status === 'active');
  
  // Calculate primary fees (ECD A, ECD B, Grade 1-2)
  const primaryGrades = ['ECD A', 'ECD B', 'Grade 1', 'Grade 2'];
  const primaryStudents = activeStudents.filter(s => primaryGrades.includes(s.grade));
  const primaryFees = primaryStudents.reduce((sum, s) => sum + s.registrationFeeAmount, 0);

  // Calculate secondary fees (Grade 3-7, Form 1-6)
  const secondaryStudents = activeStudents.filter(s => !primaryGrades.includes(s.grade));
  const secondaryFees = secondaryStudents.reduce((sum, s) => sum + s.registrationFeeAmount, 0);

  // Calculate transport fees (mock data)
  const transportFees = Math.floor(Math.random() * 200) + 100; // $100-300

  // Calculate uniform fees from transactions
  const uniformTransactions = mockTransactions.filter(t => 
    t.type === 'uniform' && t.date === dateStr
  );
  const uniformFees = uniformTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Calculate daily expenses
  const dailyExpenses = mockExpenses
    .filter(e => e.date === dateStr)
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    date: dateStr,
    primaryFees,
    secondaryFees,
    transportFees,
    uniformFees,
    totalExpenses: dailyExpenses,
    totalIncome: primaryFees + secondaryFees + transportFees + uniformFees,
  };
};

// Calculate statistics
export const calculateStats = () => {
  const activeStudents = mockStudents.filter(s => s.status === 'active').length;
  const totalRevenue = mockTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingDeletions = mockStudents.filter(s => s.status === 'transferred').length;
  
  // Get last 7 days data
  const today = new Date('2026-02-10');
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => {
    const income = mockTransactions
      .filter(t => t.date === date)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = mockExpenses
      .filter(e => e.date === date)
      .reduce((sum, e) => sum + e.amount, 0);
    
    return { date, income, expense };
  });

  return {
    activeStudents,
    totalRevenue,
    totalExpenses,
    pendingDeletions,
    dailyData,
    profit: totalRevenue - totalExpenses,
  };
};
