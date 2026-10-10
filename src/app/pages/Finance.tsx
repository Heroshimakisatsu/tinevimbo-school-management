import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { mockTransactions, mockStudents } from '../data/mockData';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Installment {
  receipt: string;
  date: string;
  amount: number;
}

// Uniform installment carries the specific item name purchased
interface UniformInstallment {
  receipt: string;
  date: string;
  amount: number;
  itemName: string;   // e.g. "Dress", "Tracksuit", "Shoes", "Shirt", "Shorts"
  itemPrice: number;  // catalogue price for that item
}

interface MonthlyColumnData {
  installments: Installment[]; // sorted oldest → newest (bottom → top)
  paid: number;
  target: number;
  complete: boolean;
}

interface UniformColumnData {
  installments: UniformInstallment[]; // sorted oldest → newest
  paid: number;
}

interface MonthRow {
  month: string;       // "Feb 2026"
  monthKey: string;    // "2026-02" for sorting
  tuition: MonthlyColumnData;
  transport: MonthlyColumnData;
  uniformItems: UniformColumnData;  // all uniform purchases merged with item labels
  relish: MonthlyColumnData;
  rowTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Monthly targets for recurring fees
const TARGETS = {
  tuition:   30,
  transport: 25,
  relish:    15,
};

// Catalogue prices for each uniform item (one-time purchases)
const UNIFORM_PRICES: Record<string, number> = {
  Dress:     45,
  Tracksuit: 35,
  Shoes:     40,
  Shirt:     25,
  Shorts:    20,
};

// ─── Helper: build month key from DD/MM/YYYY or YYYY-MM-DD ────────────────────
const toMonthKey = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const [, m, y] = dateStr.split('/');
    return `${y}-${m.padStart(2, '0')}`;
  }
  return dateStr.slice(0, 7); // "YYYY-MM"
};

const monthLabel = (key: string): string => {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// ─── Core builder ─────────────────────────────────────────────────────────────

const buildPaymentMatrix = (student: any, transactions: any[]): MonthRow[] => {
  const parseDate = (d: string) => {
    if (!d) return 0;
    if (d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)).getTime();
    }
    return new Date(d).getTime();
  };

  const toMonthKey = (dateStr: string): string => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [, m, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}`;
    }
    if (dateStr.includes('-')) {
      return dateStr.slice(0, 7); // "YYYY-MM"
    }
    return dateStr;
  };

  const monthLabel = (key: string): string => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // 1. Generate chronological list of school months (excluding April/04, August/08, December/12)
  const allMonths = [
    '2025-09', '2025-10', '2025-11',
    '2026-01', '2026-02', '2026-03',
    '2026-05', '2026-06', '2026-07',
    '2026-09', '2026-10', '2026-11'
  ];

  // Reg month key for this student
  const studentRegMonth = toMonthKey(student.registrationDate || '2026-01-01');
  
  // Filter school months to start from the student's registration month (or include 2025 if registered then)
  const schoolMonths = allMonths.filter(m => m >= studentRegMonth || m === '2025-09' || m === '2025-10' || m === '2025-11');
  
  // If the list is empty, just use the last 6 school months of allMonths
  const displayMonths = schoolMonths.length > 0 ? schoolMonths : allMonths.slice(-6);

  // Initialize columns data for each month
  const monthlyData: Record<string, {
    tuition: MonthlyColumnData;
    transport: MonthlyColumnData;
    relish: MonthlyColumnData;
    uniformItems: UniformColumnData;
  }> = {};

  displayMonths.forEach(mKey => {
    // tuition target for first month is monthly tuition (30) + registration fee (20 or 10)
    let tuitionTarget = TARGETS.tuition;
    let transportTarget = TARGETS.transport;
    let relishTarget = TARGETS.relish;

    // Check if this is the student's registration month
    const isFirstMonth = mKey === studentRegMonth || (studentRegMonth < displayMonths[0] && mKey === displayMonths[0]);
    if (isFirstMonth) {
      const regFee = student.registrationFeeAmount || 20; // use student's reg fee or default to 20
      tuitionTarget += regFee;
    }

    monthlyData[mKey] = {
      tuition: { installments: [], paid: 0, target: tuitionTarget, complete: false },
      transport: { installments: [], paid: 0, target: transportTarget, complete: false },
      relish: { installments: [], paid: 0, target: relishTarget, complete: false },
      uniformItems: { installments: [], paid: 0 }
    };
  });

  // Extract student transactions
  const studentTx = transactions.filter(t => t.registrationNumber === student.registrationNumber);

  // Split transactions by type
  const tuitionTx = studentTx.filter(t => t.type === 'tuition').sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const transportTx = studentTx.filter(t => t.type === 'transport').sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const relishTx = studentTx.filter(t => t.type === 'relish').sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const uniformTx = studentTx.filter(t => t.type === 'uniform').sort((a, b) => parseDate(a.date) - parseDate(b.date));

  // Helper function to allocate payments chronologically using absorption model
  const distributePayments = (txList: any[], field: 'tuition' | 'transport' | 'relish') => {
    txList.forEach(tx => {
      let remainingAmount = tx.amount;
      const dateLabel = tx.date.includes('-') 
        ? new Date(tx.date).toLocaleDateString('en-GB') 
        : tx.date;
      const receiptStr = String(tx.receiptNumber);

      for (const mKey of displayMonths) {
        if (remainingAmount <= 0) break;

        const col = monthlyData[mKey][field];
        const remainingTarget = col.target - col.paid;

        if (remainingTarget > 0) {
          const alloc = Math.min(remainingAmount, remainingTarget);
          col.installments.push({ receipt: receiptStr, date: dateLabel, amount: alloc });
          col.paid += alloc;
          col.complete = col.paid >= col.target;
          remainingAmount -= alloc;
        }
      }

      // Overpayment goes to the last display month
      if (remainingAmount > 0) {
        const lastMonthKey = displayMonths[displayMonths.length - 1];
        if (lastMonthKey) {
          const col = monthlyData[lastMonthKey][field];
          col.installments.push({ receipt: receiptStr, date: dateLabel, amount: remainingAmount });
          col.paid += remainingAmount;
          col.complete = col.paid >= col.target;
        }
      }
    });
  };

  // Run absorption distribution
  distributePayments(tuitionTx, 'tuition');
  distributePayments(transportTx, 'transport');
  distributePayments(relishTx, 'relish');

  // Handle uniform items (these are not absorbed across months, they stay in the month of purchase)
  uniformTx.forEach(tx => {
    const mKey = toMonthKey(tx.date);
    if (monthlyData[mKey]) {
      const dateLabel = tx.date.includes('-') 
        ? new Date(tx.date).toLocaleDateString('en-GB') 
        : tx.date;
      monthlyData[mKey].uniformItems.installments.push({
        receipt: String(tx.receiptNumber),
        date: dateLabel,
        amount: tx.amount,
        itemName: tx.otherPaymentName || 'Uniform',
        itemPrice: UNIFORM_PRICES[tx.otherPaymentName || ''] ?? tx.amount
      });
      monthlyData[mKey].uniformItems.paid += tx.amount;
    }
  });

  // Build the final row array
  const rows: MonthRow[] = displayMonths.map(mKey => {
    const data = monthlyData[mKey];
    
    // Calculate row total
    const rowTotal = data.tuition.paid + data.transport.paid + data.relish.paid + data.uniformItems.paid;

    return {
      month: monthLabel(mKey),
      monthKey: mKey,
      tuition: data.tuition,
      transport: data.transport,
      relish: data.relish,
      uniformItems: data.uniformItems,
      rowTotal
    };
  });

  // Return newest month first (top of table)
  return rows.reverse();
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressPip = ({ paid, target, color }: { paid: number; target: number; color: string }) => {
  const pct = Math.min(100, Math.round((paid / target) * 100));
  return (
    <div className="w-full mt-1">
      <div className="flex justify-between text-[9px] mb-0.5" style={{ color }}>
        <span>${paid}</span><span>${target}</span>
      </div>
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

interface InstallmentStackProps {
  col: MonthlyColumnData;
  colorClass: string;     // tailwind text color
  bgClass: string;        // tailwind bg color
  borderClass: string;    // tailwind border color
  hexColor: string;       // for progress pip
}

const InstallmentStack = ({ col, colorClass, bgClass, borderClass, hexColor }: InstallmentStackProps) => {
  if (col.target === 0 && col.installments.length === 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <CheckCircle2 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      </div>
    );
  }

  const isDebt = !col.complete && col.paid < col.target;

  return (
    <div className="flex flex-col gap-0.5">
      {/* Debt card if incomplete (in red) */}
      {isDebt && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-1 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-center flex flex-col gap-0.5"
        >
          <div className="text-[8px] font-bold uppercase tracking-wide">Pending Balance</div>
          <div className="text-[10px] font-bold">Debt: ${col.target - col.paid}</div>
        </motion.div>
      )}

      {/* Stack: newest on top (reversed array displayed top-to-bottom) */}
      {[...col.installments].reverse().map((inst, revIdx) => {
        const isNewest = revIdx === 0;
        return (
          <motion.div
            key={inst.receipt}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revIdx * 0.04 }}
            className={`p-0.5 rounded border ${bgClass} ${borderClass} ${isNewest ? 'ring-1 ring-offset-0' : ''}`}
            style={isNewest ? { ringColor: hexColor } : {}}
          >
            <div className={`text-[9px] ${colorClass} leading-tight`}>#{inst.receipt}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">{inst.date}</div>
            <div className={`text-[10px] font-bold ${colorClass}`}>${inst.amount}</div>
          </motion.div>
        );
      })}

      {col.installments.length === 0 && !isDebt && (
        <div className="text-gray-400 dark:text-gray-600 text-center text-[9px]">—</div>
      )}

      {/* Progress bar */}
      <ProgressPip paid={col.paid} target={col.target} color={isDebt ? '#EF4444' : hexColor} />

      {/* Complete badge */}
      {col.complete && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
          <span className="text-[9px] text-green-500 font-bold">Full</span>
        </div>
      )}
    </div>
  );
};

// ─── Uniform column: merged card stack with item name badge ───────────────────

const UniformStack = ({ col }: { col: UniformColumnData }) => {
  if (col.installments.length === 0) {
    return (
      <div className="text-gray-400 dark:text-gray-600 text-center text-[9px] pt-1">—</div>
    );
  }

  // Group by itemName to show per-item totals and identify debts
  const itemTotals: Record<string, { paid: number; price: number }> = {};
  col.installments.forEach(u => {
    if (!itemTotals[u.itemName]) {
      itemTotals[u.itemName] = { paid: 0, price: u.itemPrice };
    }
    itemTotals[u.itemName].paid += u.amount;
  });

  return (
    <div className="flex flex-col gap-0.5">
      {/* Render Red Debt Cards for partially paid items */}
      {Object.entries(itemTotals).map(([itemName, data]) => {
        if (data.paid < data.price) {
          const debt = data.price - data.paid;
          return (
            <motion.div
              key={`debt-${itemName}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-1 rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-center flex flex-col gap-0.5"
            >
              <div className="text-[8px] font-bold uppercase tracking-wide">Pending: {itemName}</div>
              <div className="text-[10px] font-bold">Debt: ${debt}</div>
            </motion.div>
          );
        }
        return null;
      })}

      {/* Stack: newest on top */}
      {[...col.installments].reverse().map((inst, revIdx) => {
        const isNewest = revIdx === 0;
        // Colour coding by item type
        const colorMap: Record<string, { text: string; bg: string; border: string; hex: string }> = {
          Dress:     { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', hex: '#9333ea' },
          Tracksuit: { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', hex: '#d97706' },
          Shoes:     { text: 'text-sky-600 dark:text-sky-400',    bg: 'bg-sky-50 dark:bg-sky-900/20',    border: 'border-sky-200 dark:border-sky-700',    hex: '#0284c7' },
          Shirt:     { text: 'text-teal-600 dark:text-teal-400',  bg: 'bg-teal-50 dark:bg-teal-900/20',  border: 'border-teal-200 dark:border-teal-700',  hex: '#0d9488' },
          Shorts:    { text: 'text-rose-600 dark:text-rose-400',  bg: 'bg-rose-50 dark:bg-rose-900/20',  border: 'border-rose-200 dark:border-rose-700',  hex: '#e11d48' },
        };
        const c = colorMap[inst.itemName] ?? { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', hex: '#6b7280' };
        return (
          <motion.div
            key={inst.receipt}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revIdx * 0.04 }}
            className={`p-0.5 rounded border ${c.bg} ${c.border} ${isNewest ? 'ring-1 ring-offset-0' : ''}`}
          >
            {/* Item name badge */}
            <div className={`text-[8px] font-bold uppercase tracking-wide ${c.text} leading-tight`}>{inst.itemName}</div>
            <div className={`text-[9px] ${c.text} leading-tight opacity-80`}>#{inst.receipt}</div>
            <div className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">{inst.date}</div>
            <div className={`text-[10px] font-bold ${c.text}`}>${inst.amount}
              {inst.amount < inst.itemPrice && (
                <span className="text-[8px] font-normal text-amber-500 ml-0.5">/{inst.itemPrice}</span>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Summary: total paid across all uniform items this month */}
      <div className="flex items-center justify-center gap-0.5 mt-0.5 pt-0.5 border-t border-gray-200 dark:border-gray-600">
        <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300">${col.paid} paid</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function Finance() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [paymentType, setPaymentType] = useState('');
  const [uniformSize, setUniformSize] = useState('');
  const [otherPaymentName, setOtherPaymentName] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(1008);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [formData, setFormData] = useState({
    registrationNumber: '',
    studentName: '',
    studentGrade: '',
    amount: '',
    paymentMethod: '',
  });

  useEffect(() => {
    const maxReceipt = Math.max(...transactions.map(t => t.receiptNumber));
    setReceiptNumber(maxReceipt + 1);
  }, [transactions]);

  const findStudent = (searchTerm: string) => {
    return mockStudents.find(student =>
      student.registrationNumber?.toLowerCase() === searchTerm.toLowerCase() ||
      student.name.toLowerCase() === searchTerm.toLowerCase()
    );
  };

  const getStudentPaymentStatus = (student: any) => {
    if (!student) return null;
    const studentTransactions = transactions.filter(t => t.registrationNumber === student.registrationNumber);
    const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const registrationFee = student.registrationFeeAmount || 0;
    const tuitionFee = 150;
    const totalFees = registrationFee + tuitionFee;
    const balance = totalFees - totalPaid;
    return {
      totalFees, totalPaid, balance,
      status: balance <= 0 ? 'Paid' : 'Partial',
      percentage: Math.round((totalPaid / totalFees) * 100),
    };
  };

  const getLast6MonthsPayments = (student: any) => {
    if (!student) return [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return transactions
      .filter(t => t.registrationNumber === student.registrationNumber && new Date(t.date) >= sixMonthsAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getMonthlyPaymentSummary = (student: any) => {
    const payments = getLast6MonthsPayments(student);
    const summary: { [key: string]: { tuition: any[], uniform: any[], relish: any[], other: any[] } } = {};
    payments.forEach(payment => {
      const month = new Date(payment.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!summary[month]) summary[month] = { tuition: [], uniform: [], relish: [], other: [] };
      if (payment.type === 'tuition') summary[month].tuition.push(payment);
      else if (payment.type === 'uniform') summary[month].uniform.push(payment);
      else if (payment.type === 'relish') summary[month].relish.push(payment);
      else summary[month].other.push(payment);
    });
    return summary;
  };

  const handleStudentSearch = (value: string) => {
    setSearchInput(value);
    const student = findStudent(value);
    setSelectedStudent(student);
    if (student) {
      setFormData({ ...formData, registrationNumber: student.registrationNumber || '', studentName: student.name, studentGrade: student.grade });
    } else {
      setFormData({ ...formData, registrationNumber: value, studentName: value, studentGrade: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: any = {
      id: `tx-${Date.now()}`,
      receiptNumber: receiptNumber,
      studentId: selectedStudent?.id,
      registrationNumber: formData.registrationNumber,
      studentName: formData.studentName,
      studentGrade: formData.studentGrade,
      type: paymentType as any,
      otherPaymentName: paymentType === 'uniform' ? otherPaymentName : undefined,
      amount: parseFloat(formData.amount),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: formData.paymentMethod || 'cash',
      uniformSize: paymentType === 'uniform' ? (uniformSize || undefined) : undefined,
    };

    setTransactions(prev => [...prev, newTx]);
    setReceiptNumber(prev => prev + 1);

    toast.success('Payment Recorded!', {
      description: `$${formData.amount} from ${formData.studentName} - Receipt #${receiptNumber}`,
    });

    setFormData({ registrationNumber: '', studentName: '', studentGrade: '', amount: '', paymentMethod: '' });
    setSearchInput('');
    setPaymentType('');
    setUniformSize('');
    setOtherPaymentName('');
  };

  // Build the payment matrix for the selected student
  const paymentMatrix: MonthRow[] = selectedStudent
    ? buildPaymentMatrix(selectedStudent, transactions)
    : [];

  // Compute grand totals row
  const grandTotals = paymentMatrix.reduce(
    (acc, row) => ({
      tuition:          acc.tuition          + row.tuition.paid,
      transport:        acc.transport        + row.transport.paid,
      uniformItems:     acc.uniformItems     + row.uniformItems.paid,
      relish:           acc.relish           + row.relish.paid,
      total:            acc.total            + row.rowTotal,
    }),
    { tuition: 0, transport: 0, uniformItems: 0, relish: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Finance Ledger</h1>
        <p className="text-muted-foreground font-['Inter']">Keyboard-optimized payment processing</p>
      </div>

      {/* Payment Form */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Record New Payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receipt Number */}
          <div className="space-y-2">
            <Label htmlFor="receiptNumber" className="font-['Inter']">Receipt Number</Label>
            <Input
              id="receiptNumber"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(parseInt(e.target.value) || 0)}
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              placeholder="Auto-incremented"
            />
            <p className="text-xs text-muted-foreground font-['Inter']">Auto-increments per transaction (adjustable for sync with physical receipt book)</p>
          </div>

          {/* Student Search */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber" className="font-['Inter']">Registration Number/Student Name</Label>
            <Input
              id="registrationNumber"
              value={searchInput}
              onChange={(e) => handleStudentSearch(e.target.value)}
              placeholder="Enter REG# or student name..."
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              required
              autoFocus
            />
          </div>

          {/* ── Payment Analysis Matrix ─────────────────────────────────────── */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            {selectedStudent ? (
              <div className="p-5 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-['Space_Grotesk'] text-lg font-bold mb-1 text-zinc-950 dark:text-zinc-50">
                  {selectedStudent.registrationNumber} — {selectedStudent.name} — Payment Analysis
                </h4>
<<<<<<< HEAD
              
              {/* Payment Analysis Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30">
                      <th className="text-left p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-blue-700 dark:text-blue-300 border-b-2 border-blue-200 dark:border-blue-600">Month</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Tuition</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Transport</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Dress</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Tracksuit</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Shoes</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Shirt</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Shorts</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Relish</th>
                      <th className="text-center p-1.5 md:p-2 font-['Space_Grotesk'] font-semibold text-xs text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAnalysis?.payments.map((payment: any, index: number) => (
                      <tr key={index} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-blue-900/20 transition-all duration-200 border-b border-gray-100 dark:border-gray-700">
                        <td className="p-1.5 md:p-2 font-medium text-xs font-['Space_Grotesk'] text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600">{payment.month}</td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.tuition.amount > 0 ? (
                            <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-blue-600 dark:text-blue-400 leading-none mb-0.5">#{payment.tuition.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.tuition.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${payment.tuition.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.transport.amount > 0 ? (
                            <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-green-600 dark:text-green-400 leading-none mb-0.5">#{payment.transport.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.transport.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${payment.transport.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformDress.amount > 0 ? (
                            <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-blue-600 dark:text-blue-400 leading-none mb-0.5">#{payment.uniformDress.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.uniformDress.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${payment.uniformDress.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformTracksuit.amount > 0 ? (
                            <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-green-600 dark:text-green-400 leading-none mb-0.5">#{payment.uniformTracksuit.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.uniformTracksuit.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${payment.uniformTracksuit.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShoes.amount > 0 ? (
                            <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-blue-600 dark:text-blue-400 leading-none mb-0.5">#{payment.uniformShoes.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.uniformShoes.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${payment.uniformShoes.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShirt.amount > 0 ? (
                            <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-green-600 dark:text-green-400 leading-none mb-0.5">#{payment.uniformShirt.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.uniformShirt.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${payment.uniformShirt.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShorts.amount > 0 ? (
                            <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-blue-600 dark:text-blue-400 leading-none mb-0.5">#{payment.uniformShorts.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.uniformShorts.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${payment.uniformShorts.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.relish.amount > 0 ? (
                            <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                              <div className="text-[10px] font-['Inter'] text-green-600 dark:text-green-400 leading-none mb-0.5">#{payment.relish.receipt}</div>
                              <div className="text-[9px] font-['Inter'] text-gray-500 dark:text-gray-400 leading-none mb-0.5">{payment.relish.date}</div>
                              <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${payment.relish.amount}</div>
                            </div>
                          ) : (
                            <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-1.5 md:p-2 text-center font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 border-l-2 border-green-300 dark:border-green-600">{payment.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-gradient-to-r from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/30 font-bold">
                      <td className="p-1.5 md:p-2 text-xs font-['Space_Grotesk'] text-gray-800 dark:text-gray-200 border-r-2 border-gray-300 dark:border-gray-600">TOTAL</td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-blue-600 dark:text-blue-400 font-bold leading-none mb-0.5">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.tuition}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-green-600 dark:text-green-400 font-bold leading-none mb-0.5">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.transport}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-blue-600 dark:text-blue-400 font-bold leading-none mb-0.5">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformDress}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-green-600 dark:text-green-400 font-bold leading-none mb-0.5">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.uniformTracksuit}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-blue-600 dark:text-blue-400 font-bold leading-none mb-0.5">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformShoes}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-green-600 dark:text-green-400 font-bold leading-none mb-0.5">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.uniformShirt}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-blue-600 dark:text-blue-400 font-bold leading-none mb-0.5">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformShorts}</div>
                        </div>
                      </td>
                      <td className="p-1 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600 min-w-[75px]">
                          <div className="text-[9px] font-['Inter'] text-green-600 dark:text-green-400 font-bold leading-none mb-0.5">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.relish}</div>
                        </div>
                      </td>
                      <td className="p-1.5 md:p-2 text-center font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold text-xs bg-green-100 dark:bg-green-900/30 border-l-2 border-green-400 dark:border-green-600">
                        ${paymentAnalysis?.totals.total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
=======
>>>>>>> f5836ee (Update Finance.tsx - modified payment analysis module)

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-['Inter'] text-muted-foreground">
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Month fully settled</div>
                  <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Partial payment – balance owed</div>
                  <div className="text-[10px]">Cards stacked: <span className="font-semibold">oldest at bottom → newest at top</span></div>
                  <div className="text-[10px]">Uniform cards: <span className="font-semibold">colour-coded by item type</span></div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-xs border-separate border-spacing-0 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-zinc-100/80 dark:bg-zinc-800/40">
                        <th className="w-[12%] text-left   p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Month</th>
                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Tuition<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.tuition}/mo)</span></th>
                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Transport<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.transport}/mo)</span></th>
                        <th className="w-[30%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Uniform Purchases<br/><span className="text-[9px] font-normal opacity-70">Dress · Tracksuit · Shoes · Shirt · Shorts</span></th>
                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Relish<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.relish}/mo)</span></th>
                        <th className="w-[16%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/30 dark:bg-zinc-800/10">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentMatrix.map((row) => {
                        const allRecurringDone = row.tuition.complete && row.transport.complete && row.relish.complete;
                        return (
                          <tr
                            key={row.monthKey}
                            className="transition-all duration-200 hover:bg-zinc-100/30 dark:hover:bg-zinc-800/10"
                          >
                            {/* Month label */}
                            <td className="p-2 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              <div className="font-semibold font-['Space_Grotesk'] text-zinc-800 dark:text-zinc-200 text-[11px]">{row.month}</div>
                              {allRecurringDone ? (
                                <div className="flex items-center gap-0.5 mt-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                  <span className="text-[9px] text-green-500 font-medium">Done</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 mt-1">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-500" />
                                  <span className="text-[9px] text-amber-500">Pending</span>
                                </div>
                              )}
                            </td>

                            {/* Tuition */}
                            <td className="p-1 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              {(() => {
                                const col = row.tuition;
                                const styles = col.complete
                                  ? { colorClass: 'text-green-900', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-[0.6px] border-green-300 dark:border-green-700', hex: '#064e3b' }
                                  : col.paid > 0
                                  ? { colorClass: 'text-amber-800', bgClass: 'bg-amber-100 dark:bg-amber-900/30', borderClass: 'border-[0.6px] border-amber-300 dark:border-amber-700', hex: '#b45309' }
                                  : { colorClass: 'text-red-600', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-900/50', hex: '#EF4444' };

                                return (
                                  <InstallmentStack
                                    col={col}
                                    colorClass={styles.colorClass}
                                    bgClass={styles.bgClass}
                                    borderClass={styles.borderClass}
                                    hexColor={styles.hex}
                                  />
                                );
                              })()}
                            </td>

                            {/* Transport */}
                            <td className="p-1 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              {(() => {
                                const col = row.transport;
                                const styles = col.complete
                                  ? { colorClass: 'text-green-900', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-[0.6px] border-green-300 dark:border-green-700', hex: '#064e3b' }
                                  : col.paid > 0
                                  ? { colorClass: 'text-amber-800', bgClass: 'bg-amber-100 dark:bg-amber-900/30', borderClass: 'border-[0.6px] border-amber-300 dark:border-amber-700', hex: '#b45309' }
                                  : { colorClass: 'text-red-600', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-900/50', hex: '#EF4444' };

                                return (
                                  <InstallmentStack
                                    col={col}
                                    colorClass={styles.colorClass}
                                    bgClass={styles.bgClass}
                                    borderClass={styles.borderClass}
                                    hexColor={styles.hex}
                                  />
                                );
                              })()}
                            </td>

                            {/* Uniform Purchases */}
                            <td className="p-1 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              <UniformStack col={row.uniformItems} />
                            </td>

                            {/* Relish */}
                            <td className="p-1 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              {(() => {
                                const col = row.relish;
                                const styles = col.complete
                                  ? { colorClass: 'text-green-900', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-[0.6px] border-green-300 dark:border-green-700', hex: '#064e3b' }
                                  : col.paid > 0
                                  ? { colorClass: 'text-amber-800', bgClass: 'bg-amber-100 dark:bg-amber-900/30', borderClass: 'border-[0.6px] border-amber-300 dark:border-amber-700', hex: '#b45309' }
                                  : { colorClass: 'text-red-600', bgClass: 'bg-red-50 dark:bg-red-900/20', borderClass: 'border-red-200 dark:border-red-900/50', hex: '#EF4444' };

                                return (
                                  <InstallmentStack
                                    col={col}
                                    colorClass={styles.colorClass}
                                    bgClass={styles.bgClass}
                                    borderClass={styles.borderClass}
                                    hexColor={styles.hex}
                                  />
                                );
                              })()}
                            </td>

                            {/* Row total */}
                            <td className="p-2 align-top text-center font-['Space_Grotesk'] text-xs font-bold border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">
                              ${row.rowTotal}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Grand Totals Row */}
                      <tr className="bg-zinc-100/80 dark:bg-zinc-800/40 font-bold">
                        <td className="p-2 font-['Space_Grotesk'] text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 text-[11px]">TOTAL</td>
                        {(
                          [
                            { val: grandTotals.tuition },
                            { val: grandTotals.transport },
                            { val: grandTotals.uniformItems },
                            { val: grandTotals.relish },
                          ]
                        ).map((col, i) => (
                          <td key={i} className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                            <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                              <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${col.val}</div>
                            </div>
                          </td>
                        ))}
                        <td className="p-2 text-center font-['Space_Grotesk'] text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">
                          ${grandTotals.total}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs text-muted-foreground font-['Inter']">Monthly Tuition</div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-900 dark:text-zinc-100">${TARGETS.tuition}/mo</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs text-muted-foreground font-['Inter']">Monthly Transport</div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-900 dark:text-zinc-100">${TARGETS.transport}/mo</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs text-muted-foreground font-['Inter']">Uniform Paid</div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.uniformItems}</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs text-muted-foreground font-['Inter']">Ledger Total</div>
                    <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.total}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-700">
                <p className="text-center text-muted-foreground font-['Inter']">
                  Enter a registration number or student name to view payment analysis
                </p>
              </div>
            )}
          </div>

          {/* Student Grade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="studentGrade" className="font-['Inter']">Student Grade</Label>
              <Input
                id="studentGrade"
                value={formData.studentGrade}
                onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                placeholder="Auto-filled from search"
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              />
              <p className="text-xs text-muted-foreground font-['Inter']">Auto-populated from student search (adjustable for syncing)</p>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-['Inter']">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="font-['Inter']">Payment Method</Label>
            <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="ecocash">EcoCash</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label htmlFor="paymentType" className="font-['Inter']">Payment Type</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="relish">Relish</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Uniform Size Selector */}
          {paymentType === 'uniform' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[20px] bg-[#3B82F6]/10 border border-[#3B82F6]/30"
            >
              <Label className="font-['Inter'] text-[#3B82F6] mb-3 block">Select Uniform Size</Label>
              <div className="flex gap-2">
                {['S', 'M', 'L', 'XL'].map((size) => (
                  <Button
                    key={size}
                    type="button"
                    onClick={() => setUniformSize(size)}
                    className={`rounded-[20px] font-['Space_Grotesk'] ${
                      uniformSize === size
                        ? 'bg-[#3B82F6] text-white'
                        : 'dark:bg-white/10 dark:text-foreground dark:hover:bg-white/20 bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Other Payment Name */}
          {paymentType === 'other' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="otherPaymentName" className="font-['Inter']">Payment Name</Label>
              <Input
                id="otherPaymentName"
                value={otherPaymentName}
                onChange={(e) => setOtherPaymentName(e.target.value)}
                placeholder="Enter payment type name..."
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
                required
              />
              <p className="text-xs text-muted-foreground font-['Inter']">Specify the name of the payment type</p>
            </motion.div>
          )}

          <Button
            type="submit"
            className="w-full rounded-[20px] bg-[#10B981] hover:bg-[#059669] text-white h-12 font-['Space_Grotesk']"
          >
            Record Payment
          </Button>
        </form>
      </GlassCard>

      {/* Student Payment Status */}
      {selectedStudent && (
        <GlassCard>
          <h3 className="font-['Space_Grotesk'] text-lg mb-4">Student Payment Status</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-['Space_Grotesk'] text-lg text-blue-600 dark:text-blue-400">{selectedStudent.name}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-['Inter'] font-medium ${
                    getStudentPaymentStatus(selectedStudent)?.status === 'Paid'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {getStudentPaymentStatus(selectedStudent)?.status || 'Unknown'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-['Inter']">Total Fees:</span>
                    <span className="font-['Space_Grotesk'] font-semibold">${(getStudentPaymentStatus(selectedStudent)?.totalFees || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-['Inter']">Amount Paid:</span>
                    <span className="font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400">${(getStudentPaymentStatus(selectedStudent)?.totalPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-['Inter']">Balance:</span>
                    <span className={`font-['Space_Grotesk'] font-semibold ${(getStudentPaymentStatus(selectedStudent)?.balance || 0) <= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${Math.abs(getStudentPaymentStatus(selectedStudent)?.balance || 0).toFixed(2)}
                      {(getStudentPaymentStatus(selectedStudent)?.balance || 0) > 0 ? ' (Owed)' : ' (Credit)'}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground font-['Inter'] mb-1">
                    <span>Payment Progress</span>
                    <span>{getStudentPaymentStatus(selectedStudent)?.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (getStudentPaymentStatus(selectedStudent)?.percentage || 0) >= 100
                          ? 'bg-green-500'
                          : (getStudentPaymentStatus(selectedStudent)?.percentage || 0) >= 50
                            ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(getStudentPaymentStatus(selectedStudent)?.percentage || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Last 6 Months Payment History */}
            <div className="space-y-4">
              <h4 className="font-['Space_Grotesk'] text-lg mb-3">Last 6 Months Payments</h4>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {Object.entries(getMonthlyPaymentSummary(selectedStudent)).map(([month, data]) => (
                  <div key={month} className="p-4 rounded-[20px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium font-['Inter']">{month}</span>
                      <span className="text-sm text-muted-foreground font-['Inter']">
                        {data.tuition.length + data.uniform.length + data.relish.length + data.other.length} payment{data.tuition.length + data.uniform.length + data.relish.length + data.other.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {data.tuition.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-['Inter'] rounded">TUITION</span>
                          <span className="text-sm font-medium font-['Inter']">Tuition Fees</span>
                        </div>
                        {data.tuition.map((payment: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">${payment.amount}</span>
                              <span className="text-xs text-muted-foreground font-['Inter']">{payment.paymentMethod}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.uniform.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-['Inter'] rounded">UNIFORM</span>
                          <span className="text-sm font-medium font-['Inter']">Uniform Fees</span>
                        </div>
                        {data.uniform.map((payment: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-purple-600 dark:text-purple-400">${payment.amount}</span>
                              <span className="text-xs text-muted-foreground font-['Inter']">{payment.uniformSize}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.relish.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-['Inter'] rounded">RELISH</span>
                          <span className="text-sm font-medium font-['Inter']">Relish Fees</span>
                        </div>
                        {data.relish.map((payment: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">${payment.amount}</span>
                              <span className="text-xs text-muted-foreground font-['Inter']">{payment.paymentMethod}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {Object.keys(getMonthlyPaymentSummary(selectedStudent)).length === 0 && (
                  <p className="text-center text-muted-foreground font-['Inter'] text-sm">No payments recorded in the last 6 months</p>
                )}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Recent Transactions */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableHead className="font-['Inter']">Receipt #</TableHead>
                <TableHead className="font-['Inter']">Student</TableHead>
                <TableHead className="font-['Inter']">Grade</TableHead>
                <TableHead className="font-['Inter']">Type</TableHead>
                <TableHead className="font-['Inter'] text-right">Amount</TableHead>
                <TableHead className="font-['Inter']">Date</TableHead>
                <TableHead className="font-['Inter']">Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.slice().reverse().map((transaction) => (
                <TableRow key={transaction.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981]">#{transaction.receiptNumber}</TableCell>
                  <TableCell className="font-['Inter']">{transaction.studentName}</TableCell>
                  <TableCell className="font-['Inter'] text-muted-foreground">{transaction.studentGrade}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                      transaction.type === 'tuition' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                      transaction.type === 'uniform' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' :
                      transaction.type === 'relish'  ? 'bg-[#10B981]/10 text-[#10B981]' :
                                                       'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}>
                      {transaction.type === 'other' ? transaction.otherPaymentName : transaction.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-right">${transaction.amount}</TableCell>
                  <TableCell className="font-['Inter'] text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                      transaction.paymentMethod === 'cash'    ? 'bg-green-100  text-green-800  dark:bg-green-900/20  dark:text-green-400' :
                      transaction.paymentMethod === 'ecocash' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                                                'bg-blue-100   text-blue-800   dark:bg-blue-900/20   dark:text-blue-400'
                    }`}>
                      {transaction.paymentMethod}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
