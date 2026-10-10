import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { api } from '../../utils/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Loader2, RotateCcw, ArrowRight, ArrowLeft, Shirt, Utensils } from 'lucide-react';
import { cn } from '../components/ui/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Installment {
  receipt: string;
  date: string;
  amount: number;
}

interface UniformInstallment {
  receipt: string;
  date: string;
  amount: number;
  itemName: string;
  itemPrice: number;
}

interface MonthlyColumnData {
  installments: Installment[];
  paid: number;
  target: number;
  complete: boolean;
}

interface UniformColumnData {
  installments: UniformInstallment[];
  paid: number;
}

interface MonthRow {
  month: string;
  monthKey: string;
  tuition: MonthlyColumnData;
  transport: MonthlyColumnData;
  uniformItems: UniformColumnData;
  relish: MonthlyColumnData;
  rowTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIFORM_PRICES: Record<string, number> = {
  Dress:     45,
  Tracksuit: 35,
  Shoes:     40,
  Shirt:     25,
  Shorts:    20,
};

// Academic calendar structure
const ACADEMIC_MONTH_NUMBERS = [1, 2, 3, 5, 6, 7, 9, 10, 11]; // Skip April, August, December
const TERM_MONTHS = {
  1: [1, 2, 3],    // January, February, March
  2: [5, 6, 7],    // May, June, July
  3: [9, 10, 11],  // September, October, November
};

const TARGETS = {
  tuition: 30,
  transport: 25,
  relish: 15,
};

const getTermForMonth = (month: number): number => {
  if ([1, 2, 3].includes(month)) return 1;
  if ([5, 6, 7].includes(month)) return 2;
  if ([9, 10, 11].includes(month)) return 3;
  return 1; // Default to term 1
};

const buildPaymentMatrix = (student: any, transactions: any[], termFees: any[]): MonthRow[] => {
  const isECDStudent = student.grade === 'ECD A' || student.grade === 'ECD B';
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
      return dateStr.slice(0, 7);
    }
    return dateStr;
  };

  const monthLabel = (key: string): string => {
    const [y, m] = key.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const generateAcademicMonths = (startKey: string, endKey: string): string[] => {
    const months: string[] = [];
    let [y, m] = startKey.split('-').map(Number);
    const [ey, em] = endKey.split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      if (ACADEMIC_MONTH_NUMBERS.includes(m)) {
        months.push(`${y}-${String(m).padStart(2, '0')}`);
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const studentRegMonth = toMonthKey(student.registration_date || student.registrationDate || currentMonthKey);
  const academicYear = student.academicYear || now.getFullYear().toString();

  let displayMonths = generateAcademicMonths(studentRegMonth, currentMonthKey);
  if (displayMonths.length === 0) displayMonths = [currentMonthKey];

  // Get term fees for student's grade and academic year
  const getTermFeeForMonth = (monthKey: string, grade: string, academicYear: string) => {
    const [y, m] = monthKey.split('-').map(Number);
    const term = getTermForMonth(m);
    
    // First try to find the specific term fee
    let termFee = termFees.find(tf => 
      tf.grade === grade && 
      tf.academic_year === academicYear && 
      tf.term === term
    );
    
    // If not found, try to use any term fee for this grade/year as fallback
    if (!termFee) {
      termFee = termFees.find(tf => 
        tf.grade === grade && 
        tf.academic_year === academicYear
      );
    }
    
    if (!termFee) {
      // Fallback to hardcoded targets if no term fee found at all
      return { tuition: 30, transport: 25, relish: 15 };
    }

    // Calculate monthly targets by dividing term fees by number of months in term
    const termMonths = TERM_MONTHS[term as keyof typeof TERM_MONTHS] || [1, 2, 3];
    const monthsInTerm = termMonths.length;

    return {
      tuition: (termFee.tuition_fee || 0) / monthsInTerm,
      transport: (termFee.transport_fee || 0) / monthsInTerm,
      relish: isECDStudent ? (termFee.relish_fee || 0) / monthsInTerm : 0,
    };
  };

  const monthlyData: Record<string, {
    tuition: MonthlyColumnData;
    transport: MonthlyColumnData;
    relish: MonthlyColumnData;
    uniformItems: UniformColumnData;
  }> = {};

  displayMonths.forEach(mKey => {
    const feeTargets = getTermFeeForMonth(mKey, student.grade, academicYear);
    let tuitionTarget = feeTargets.tuition;
    let transportTarget = feeTargets.transport;
    let relishTarget = feeTargets.relish;

    const isFirstMonth = mKey === studentRegMonth || (studentRegMonth < displayMonths[0] && mKey === displayMonths[0]);
    if (isFirstMonth) {
      const regFee = student.registrationFeeAmount || student.registration_fee_amount || 0;
      tuitionTarget += regFee;
    }

    monthlyData[mKey] = {
      tuition: { installments: [], paid: 0, target: tuitionTarget, complete: false },
      transport: { installments: [], paid: 0, target: transportTarget, complete: false },
      relish: { installments: [], paid: 0, target: relishTarget, complete: false },
      uniformItems: { installments: [], paid: 0 }
    };
  });

  const studentTx = transactions.filter(t => t.registrationNumber === student.registrationNumber);

  const tuitionTx = studentTx.filter(t => t.type === 'tuition').sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const transportTx = studentTx.filter(t => t.type === 'transport').sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const relishTx = isECDStudent ? studentTx.filter(t => t.type === 'relish').sort((a, b) => parseDate(a.date) - parseDate(b.date)) : [];
  const uniformTx = studentTx.filter(t => t.type === 'uniform').sort((a, b) => parseDate(a.date) - parseDate(b.date));

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

  distributePayments(tuitionTx, 'tuition');
  distributePayments(transportTx, 'transport');
  distributePayments(relishTx, 'relish');

  uniformTx.forEach(tx => {
    const mKey = tx.date.slice(0, 7);
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

  const rows: MonthRow[] = displayMonths.map(mKey => {
    const data = monthlyData[mKey];
    const rowTotal = data.tuition.paid + data.transport.paid + (isECDStudent ? data.relish.paid : 0) + data.uniformItems.paid;

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

  return rows.reverse();
};

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
  colorClass: string;
  bgClass: string;
  borderClass: string;
  hexColor: string;
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

      {[...col.installments].reverse().map((inst, revIdx) => {
        const isNewest = revIdx === 0;
        return (
          <motion.div
            key={inst.receipt}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: revIdx * 0.04 }}
            className={`p-0.5 rounded border ${bgClass} ${borderClass} ${isNewest ? 'ring-1 ring-offset-0' : ''}`}
            style={isNewest ? { boxShadow: `0 0 0 1px ${hexColor}` } : {}}
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

      <ProgressPip paid={col.paid} target={col.target} color={isDebt ? '#EF4444' : hexColor} />

      {col.complete && (
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
          <span className="text-[9px] text-green-500 font-bold">Full</span>
        </div>
      )}
    </div>
  );
};

const UniformStack = ({ col }: { col: UniformColumnData }) => {
  if (col.installments.length === 0) {
    return (
      <div className="text-gray-400 dark:text-gray-600 text-center text-[9px] pt-1">—</div>
    );
  }

  const itemTotals: Record<string, { paid: number; price: number }> = {};
  col.installments.forEach(u => {
    if (!itemTotals[u.itemName]) {
      itemTotals[u.itemName] = { paid: 0, price: u.itemPrice };
    }
    itemTotals[u.itemName].paid += u.amount;
  });

  return (
    <div className="flex flex-col gap-0.5">
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

      {[...col.installments].reverse().map((inst, revIdx) => {
        const isNewest = revIdx === 0;
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

      <div className="flex items-center justify-center gap-0.5 mt-0.5 pt-0.5 border-t border-gray-200 dark:border-gray-600">
        <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300">${col.paid} paid</span>
      </div>
    </div>
  );
};

interface ReceiptAuditBoxProps {
  defaultVal: string;
  currentVal: string;
  changedBy: string;
  setChangedBy: (val: string) => void;
  reason: string;
  setReason: (val: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

const ReceiptAuditBox = ({
  defaultVal,
  currentVal,
  changedBy,
  setChangedBy,
  reason,
  setReason,
  onApply,
  onCancel,
}: ReceiptAuditBoxProps) => {
  return (
    <div
      className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-700/60 dark:bg-amber-900/10 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] font-['Inter'] text-amber-800 dark:text-amber-300">
        Change receipt from <span className="font-bold">{defaultVal || '0001'}</span> to <span className="font-bold">{currentVal || '—'}</span>
      </p>
      <input
        data-slot="input"
        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex w-full min-w-0 border px-3 py-1 bg-white dark:bg-zinc-950 transition-[color,box-shadow] outline-none h-8 text-[11px] rounded-md border-amber-300 dark:border-amber-700 focus-visible:border-amber-500 focus-visible:ring-amber-500/30 focus-visible:ring-[2px]"
        placeholder="Changed by"
        value={changedBy}
        onChange={(e) => setChangedBy(e.target.value)}
      />
      <textarea
        placeholder="Write why this receipt number is being changed"
        className="min-h-[60px] w-full resize-none rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] text-zinc-700 outline-none focus:border-amber-500 dark:border-amber-700 dark:bg-zinc-950 dark:text-zinc-100"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          data-slot="button"
          className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-[#10B981] text-white hover:bg-[#059669] rounded-md gap-1.5 h-7 px-2.5 text-[10px] cursor-pointer"
          type="button"
          disabled={!changedBy.trim() || !reason.trim()}
          onClick={onApply}
        >
          Apply
        </button>
        <button
          data-slot="button"
          className="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all border border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md gap-1.5 h-7 px-2.5 text-[10px] cursor-pointer"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export function Finance() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [studentTx, setStudentTx] = useState<any[]>([]);
  const [monthPage, setMonthPage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [termFees, setTermFees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    studentName: '',
    studentGrade: '',
  });
  
  // Filter states
  const [filterType, setFilterType] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [gradeRangeFilter, setGradeRangeFilter] = useState('all');
  const [dateFilterMode, setDateFilterMode] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  
  // Payment type card states
  const [tuitionSelected, setTuitionSelected] = useState(false);
  const [tuitionAmount, setTuitionAmount] = useState('');
  const [tuitionReceipt, setTuitionReceipt] = useState('');
  const [tuitionPaymentMethod, setTuitionPaymentMethod] = useState('cash');

  const [transportSelected, setTransportSelected] = useState(false);
  const [transportAmount, setTransportAmount] = useState('');
  const [transportReceipt, setTransportReceipt] = useState('');
  const [transportPaymentMethod, setTransportPaymentMethod] = useState('cash');

  const [uniformSelected, setUniformSelected] = useState(false);
  const [uniformAmount, setUniformAmount] = useState('');
  const [uniformReceipt, setUniformReceipt] = useState('');
  const [uniformPaymentMethod, setUniformPaymentMethod] = useState('cash');

  const [relishSelected, setRelishSelected] = useState(false);
  const [relishAmount, setRelishAmount] = useState('');
  const [relishReceipt, setRelishReceipt] = useState('');
  const [relishPaymentMethod, setRelishPaymentMethod] = useState('cash');

  const [otherSelected, setOtherSelected] = useState(false);
  const [otherAmount, setOtherAmount] = useState('');
  const [otherReceipt, setOtherReceipt] = useState('');
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('cash');
  
  // Receipt book types
  const [receiptNumbers, setReceiptNumbers] = useState<any>({
    secondary_tuition: { current: 0, next: 1, formatted: '0001' },
    primary_tuition: { current: 0, next: 1, formatted: '0001' },
    tuition: { current: 0, next: 1, formatted: '0001' },
    transport: { current: 0, next: 1, formatted: '0001' },
    relish: { current: 0, next: 1, formatted: '0001' },
    uniform: { current: 0, next: 1, formatted: '0001' },
    other: { current: 0, next: 1, formatted: '0001' }
  });

  // Receipt override audit states
  const [tuitionAudit, setTuitionAudit] = useState({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
  const [transportAudit, setTransportAudit] = useState({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
  const [uniformAudit, setUniformAudit] = useState({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
  const [relishAudit, setRelishAudit] = useState({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
  const [otherAudit, setOtherAudit] = useState({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });

  const getIntakeAlignedReceiptDefaults = (student?: any, currentReceipts?: any) => {
    const s = student || selectedStudent;
    const r = currentReceipts || receiptNumbers;
    const isSecondaryTuition = s && ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].includes(s.grade);

    return {
      tuition: isSecondaryTuition
        ? (r.secondary_tuition?.formatted || r.primary_tuition?.formatted || '0001')
        : (r.primary_tuition?.formatted || '0001'),
      transport: r.transport?.formatted || '0001',
      relish: r.primary_tuition?.formatted || '0001',
      uniform: r.uniform?.formatted || '0001',
      other: r.other?.formatted || '0001',
    };
  };

  const getTuitionDefault = (student?: any, currentReceipts?: any) => getIntakeAlignedReceiptDefaults(student, currentReceipts).tuition;
  const getTransportDefault = (currentReceipts?: any) => getIntakeAlignedReceiptDefaults(undefined, currentReceipts).transport;
  const getUniformDefault = (currentReceipts?: any) => getIntakeAlignedReceiptDefaults(undefined, currentReceipts).uniform;
  const getRelishDefault = (currentReceipts?: any) => getIntakeAlignedReceiptDefaults(undefined, currentReceipts).relish;
  const getOtherDefault = (currentReceipts?: any) => getIntakeAlignedReceiptDefaults(undefined, currentReceipts).other;

  const handleReceiptChange = (
    val: string,
    setVal: (v: string) => void,
    defaultVal: string,
    setAudit: React.Dispatch<React.SetStateAction<any>>
  ) => {
    const clean = val.replace(/[^0-9]/g, '');
    setVal(clean);
    if (clean && clean !== defaultVal) {
      setAudit((prev: any) => ({
        ...prev,
        defaultVal,
        isOpen: true,
        isApplied: false,
      }));
    } else {
      setAudit((prev: any) => ({
        ...prev,
        defaultVal,
        isOpen: false,
        isApplied: false,
      }));
    }
  };

  const loadLedger = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/students/transactions');
      setTransactions(data);
      
      // Load current receipt numbers for each book type
      const receiptData = await api.get('/receipts/current');
      setReceiptNumbers(receiptData);

      // Keep Finance defaults aligned with Intake before any manual edit.
      if (selectedStudent) {
        const defaults = getIntakeAlignedReceiptDefaults(selectedStudent, receiptData);

        setTuitionReceipt(defaults.tuition);
        setTransportReceipt(defaults.transport);
        setUniformReceipt(defaults.uniform);
        setRelishReceipt(defaults.relish);
        setOtherReceipt(defaults.other);

        setTuitionAudit(prev => ({ ...prev, defaultVal: defaults.tuition }));
        setTransportAudit(prev => ({ ...prev, defaultVal: defaults.transport }));
        setUniformAudit(prev => ({ ...prev, defaultVal: defaults.uniform }));
        setRelishAudit(prev => ({ ...prev, defaultVal: defaults.relish }));
        setOtherAudit(prev => ({ ...prev, defaultVal: defaults.other }));
      }
    } catch (error) {
      console.error('Failed to load transaction ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTermFees = async () => {
    try {
      const currentYear = new Date().getFullYear().toString();
      const data = await api.get<any[]>('/term-fees', { academic_year: currentYear });
      setTermFees(data);
    } catch (error) {
      console.error('Failed to load term fees:', error);
    }
  };

  useEffect(() => {
    loadLedger();
    loadTermFees();
  }, []);

  const handleStudentSearch = async (value: string) => {
    setSearchInput(value);
    if (!value.trim()) {
      setSearchResults([]);
      setSelectedStudent(null);
      setStudentTx([]);
      setFormData({ registrationNumber: '', studentName: '', studentGrade: '' });
      setTuitionAmount('');
      setTransportAmount('');
      setUniformAmount('');
      setRelishAmount('');
      setOtherAmount('');
      setTuitionSelected(false);
      setTransportSelected(false);
      setUniformSelected(false);
      setRelishSelected(false);
      setOtherSelected(false);
      setTuitionAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setTransportAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setUniformAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setRelishAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setOtherAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      return;
    }

    try {
      const results = await api.get<any[]>('/students/search', { q: value });
      setSearchResults(results);

      const normalizedInput = value.trim().toLowerCase();
      const exactMatch = results.find((student: any) => {
        const fullName = `${student.first_name || ''} ${student.surname || ''}`.trim().toLowerCase();
        return (
          (student.registration_number || '').toLowerCase() === normalizedInput ||
          fullName === normalizedInput ||
          (student.first_name || '').toLowerCase() === normalizedInput ||
          (student.surname || '').toLowerCase() === normalizedInput
        );
      });

      if (exactMatch) {
        await selectStudent(exactMatch);
        return;
      }

      if (results.length === 1) {
        await selectStudent(results[0]);
      }
    } catch (error) {
      console.error('Failed to search students:', error);
    }
  };

  const selectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchInput(`${student.first_name} ${student.surname} (${student.registration_number})`);
    setSearchResults([]);
    setMonthPage(0);

    const defaults = getIntakeAlignedReceiptDefaults(student);
    
    setTuitionReceipt(defaults.tuition);
    setTransportReceipt(defaults.transport);
    setUniformReceipt(defaults.uniform);
    setRelishReceipt(defaults.relish);
    setOtherReceipt(defaults.other);

    setTuitionAudit({ defaultVal: defaults.tuition, isOpen: false, changedBy: '', reason: '', isApplied: false });
    setTransportAudit({ defaultVal: defaults.transport, isOpen: false, changedBy: '', reason: '', isApplied: false });
    setUniformAudit({ defaultVal: defaults.uniform, isOpen: false, changedBy: '', reason: '', isApplied: false });
    setRelishAudit({ defaultVal: defaults.relish, isOpen: false, changedBy: '', reason: '', isApplied: false });
    setOtherAudit({ defaultVal: defaults.other, isOpen: false, changedBy: '', reason: '', isApplied: false });

    try {
      const history = await api.get<any[]>(`/students/${student.registration_number}/transactions`);
      const mappedHistory = history.map((t: any) => ({
        ...t,
        registrationNumber: t.registration_number,
        receiptNumber: t.receipt_number,
        studentName: `${student.first_name} ${student.surname}`,
        studentGrade: student.grade,
      }));
      setStudentTx(mappedHistory);
      
      setFormData({
        registrationNumber: student.registration_number,
        studentName: `${student.first_name} ${student.surname}`,
        studentGrade: student.grade,
      });
    } catch (error) {
      toast.error('Failed to load student payment details');
    }
  };

  const getStudentPaymentStatus = (student: any) => {
    if (!student) return null;
    const totalPaid = studentTx.reduce((sum, t) => sum + t.amount, 0);
    const registrationFee = student.registration_fee_amount || 0;
    const tuitionFee = 150; // standard mock target
    const totalFees = registrationFee + tuitionFee;
    const balance = totalFees - totalPaid;
    return {
      totalFees, totalPaid, balance,
      status: balance <= 0 ? 'Paid' : 'Partial',
      percentage: Math.round((totalPaid / totalFees) * 100),
    };
  };

  const getMonthlyPaymentSummary = (student: any) => {
    const isECDStudent = student && (student.grade === 'ECD A' || student.grade === 'ECD B');
    const summary: { [key: string]: { tuition: any[], uniform: any[], relish: any[], other: any[] } } = {};
    studentTx.forEach(payment => {
      const month = new Date(payment.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!summary[month]) summary[month] = { tuition: [], uniform: [], relish: [], other: [] };
      if (payment.type === 'tuition') summary[month].tuition.push(payment);
      else if (payment.type === 'uniform') summary[month].uniform.push(payment);
      else if (payment.type === 'relish' && isECDStudent) summary[month].relish.push(payment);
      else summary[month].other.push(payment);
    });
    return summary;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student from the list first.');
      return;
    }

    if (tuitionSelected && tuitionAudit.isOpen && !tuitionAudit.isApplied) {
      toast.error('Please apply or cancel the manual receipt change for Tuition.');
      return;
    }
    if (transportSelected && transportAudit.isOpen && !transportAudit.isApplied) {
      toast.error('Please apply or cancel the manual receipt change for Transport.');
      return;
    }
    if (uniformSelected && uniformAudit.isOpen && !uniformAudit.isApplied) {
      toast.error('Please apply or cancel the manual receipt change for Uniform.');
      return;
    }
    if (isECDStudent && relishSelected && relishAudit.isOpen && !relishAudit.isApplied) {
      toast.error('Please apply or cancel the manual receipt change for Bread & Relish.');
      return;
    }
    if (otherSelected && otherAudit.isOpen && !otherAudit.isApplied) {
      toast.error('Please apply or cancel the manual receipt change for Other.');
      return;
    }

    try {
      // Collect payments from all cards
      const payments = [];
      
      if (tuitionSelected && tuitionAmount && parseFloat(tuitionAmount) > 0) {
        payments.push({
          receipt_number: tuitionReceipt || receiptNumbers.primary_tuition?.formatted || receiptNumbers.tuition?.formatted || '0001',
          type: 'tuition',
          amount: parseFloat(tuitionAmount),
          payment_method: tuitionPaymentMethod || 'cash',
        });
      }
      
      if (transportSelected && transportAmount && parseFloat(transportAmount) > 0) {
        payments.push({
          receipt_number: transportReceipt || receiptNumbers.transport?.formatted || '0001',
          type: 'transport',
          amount: parseFloat(transportAmount),
          payment_method: transportPaymentMethod || 'cash',
        });
      }

      if (uniformSelected && uniformAmount && parseFloat(uniformAmount) > 0) {
        payments.push({
          receipt_number: uniformReceipt || receiptNumbers.uniform?.formatted || '0001',
          type: 'uniform',
          amount: parseFloat(uniformAmount),
          payment_method: uniformPaymentMethod || 'cash',
        });
      }

      if (isECDStudent && relishSelected && relishAmount && parseFloat(relishAmount) > 0) {
        payments.push({
          receipt_number: relishReceipt || receiptNumbers.relish?.formatted || '0001',
          type: 'relish',
          amount: parseFloat(relishAmount),
          payment_method: relishPaymentMethod || 'cash',
        });
      }
      
      if (otherSelected && otherAmount && parseFloat(otherAmount) > 0) {
        payments.push({
          receipt_number: otherReceipt || receiptNumbers.other?.formatted || '0001',
          type: 'other',
          amount: parseFloat(otherAmount),
          payment_method: otherPaymentMethod || 'cash',
          other_payment_name: 'Other Payment',
        });
      }

      if (payments.length === 0) {
        toast.error('Please enter an amount for at least one payment type.');
        return;
      }

      const payload = { payments };

      await api.post(`/students/${selectedStudent.registration_number}/transactions`, payload);

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      toast.success('Payment(s) Recorded Successfully!', {
        description: `$${totalAmount.toFixed(2)} recorded for ${formData.studentName}`,
      });

      // Reset Form and reload history
      setFormData({ registrationNumber: '', studentName: '', studentGrade: '' });
      setSearchInput('');
      setSelectedStudent(null);
      setStudentTx([]);
      setTuitionAmount('');
      setTransportAmount('');
      setUniformAmount('');
      setRelishAmount('');
      setOtherAmount('');
      setTuitionReceipt('');
      setTransportReceipt('');
      setUniformReceipt('');
      setRelishReceipt('');
      setOtherReceipt('');
      setTuitionAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setTransportAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setUniformAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setRelishAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setOtherAudit({ defaultVal: '', isOpen: false, changedBy: '', reason: '', isApplied: false });
      setTuitionPaymentMethod('cash');
      setTransportPaymentMethod('cash');
      setUniformPaymentMethod('cash');
      setRelishPaymentMethod('cash');
      setOtherPaymentMethod('cash');
      setTuitionSelected(false);
      setTransportSelected(false);
      setUniformSelected(false);
      setRelishSelected(false);
      setOtherSelected(false);
      loadLedger();
    } catch (error: any) {
      toast.error('Failed to submit payment', {
        description: error.message || 'Error occurred while saving transaction.',
      });
    }
  };

  const mappedStudent = selectedStudent ? {
    registrationNumber: selectedStudent.registration_number,
    registrationDate: selectedStudent.registration_date,
    registrationFeeAmount: selectedStudent.registration_fee_amount,
    name: `${selectedStudent.first_name} ${selectedStudent.surname}`,
    grade: selectedStudent.grade,
    academicYear: selectedStudent.academic_year || new Date().getFullYear().toString(),
  } : null;

  const paymentMatrix: MonthRow[] = mappedStudent
    ? buildPaymentMatrix(mappedStudent, studentTx, termFees)
    : [];

  const displayedRows = paymentMatrix.slice(monthPage * 12, (monthPage + 1) * 12);

  const isECDStudent = selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B');

  const grandTotals = displayedRows.reduce(
    (acc, row) => ({
      tuition:          acc.tuition          + row.tuition.paid,
      transport:        acc.transport        + row.transport.paid,
      uniformItems:     acc.uniformItems     + row.uniformItems.paid,
      relish:           acc.relish           + (isECDStudent ? row.relish.paid : 0),
      total:            acc.total            + row.rowTotal,
    }),
    { tuition: 0, transport: 0, uniformItems: 0, relish: 0, total: 0 }
  );

  const paymentCardBase = 'p-4 rounded-[20px] border-2 transition-all cursor-pointer bg-white dark:bg-white/5 border-gray-200 dark:border-white/10';
  const paymentCardTuition = tuitionSelected ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400' : 'hover:border-blue-300 dark:hover:border-blue-500';
  const paymentCardTransport = transportSelected ? 'bg-green-50/80 dark:bg-green-900/20 border-green-500 dark:border-green-400' : 'hover:border-green-300 dark:hover:border-green-500';
  const paymentCardUniform = uniformSelected ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-500 dark:border-amber-400' : 'hover:border-amber-300 dark:hover:border-amber-500';
  const paymentCardRelish = relishSelected ? 'bg-teal-50/80 dark:bg-teal-900/20 border-teal-500 dark:border-teal-400' : 'hover:border-teal-300 dark:hover:border-teal-500';
  const paymentCardOther = otherSelected ? 'bg-purple-50/80 dark:bg-purple-900/20 border-purple-500 dark:border-purple-400' : 'hover:border-purple-300 dark:hover:border-purple-500';

  const tuitionBadgeBase = 'p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  const tuitionBadgeSelected = 'p-3 rounded-full bg-blue-500 text-white';
  const transportBadgeBase = 'p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
  const transportBadgeSelected = 'p-3 rounded-full bg-green-500 text-white';
  const uniformBadgeBase = 'p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
  const uniformBadgeSelected = 'p-3 rounded-full bg-amber-500 text-white';
  const relishBadgeBase = 'p-3 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
  const relishBadgeSelected = 'p-3 rounded-full bg-teal-500 text-white';
  const otherBadgeBase = 'p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
  const otherBadgeSelected = 'p-3 rounded-full bg-purple-500 text-white';

  const inputBaseClass = 'h-9 rounded-[12px] text-sm font-["Inter"] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200 dark:border-gray-700';
  const tuitionInputFocus = 'focus:border-blue-500 focus:ring-blue-500';
  const transportInputFocus = 'focus:border-green-500 focus:ring-green-500';
  const uniformInputFocus = 'focus:border-amber-500 focus:ring-amber-500';
  const relishInputFocus = 'focus:border-teal-500 focus:ring-teal-500';
  const otherInputFocus = 'focus:border-purple-500 focus:ring-purple-500';
  const handleToggleTuition = () => {
    const next = !tuitionSelected;
    setTuitionSelected(next);
    if (next) {
      const defaultReceipt = getTuitionDefault();
      setTuitionReceipt(defaultReceipt);
      setTuitionAudit(prev => ({ ...prev, defaultVal: defaultReceipt }));
      if (!tuitionAmount || tuitionAmount === '0') {
        const fee = termFees.find((tf: any) => tf.grade === selectedStudent?.grade || tf.grade_code === selectedStudent?.grade_code);
        setTuitionAmount(String(fee?.tuition_fee ?? TARGETS.tuition));
      }
    }
  };

  const handleToggleTransport = () => {
    const next = !transportSelected;
    setTransportSelected(next);
    if (next) {
      const defaultReceipt = getTransportDefault();
      setTransportReceipt(defaultReceipt);
      setTransportAudit(prev => ({ ...prev, defaultVal: defaultReceipt }));
      if (!transportAmount || transportAmount === '0') {
        const fee = termFees.find((tf: any) => tf.grade === selectedStudent?.grade || tf.grade_code === selectedStudent?.grade_code);
        setTransportAmount(String(fee?.transport_fee ?? TARGETS.transport));
      }
    }
  };

  const handleToggleUniform = () => {
    const next = !uniformSelected;
    setUniformSelected(next);
    if (next) {
      const defaultReceipt = getUniformDefault();
      setUniformReceipt(defaultReceipt);
      setUniformAudit(prev => ({ ...prev, defaultVal: defaultReceipt }));
    }
  };

  const handleToggleRelish = () => {
    const next = !relishSelected;
    setRelishSelected(next);
    if (next) {
      const defaultReceipt = getRelishDefault();
      setRelishReceipt(defaultReceipt);
      setRelishAudit(prev => ({ ...prev, defaultVal: defaultReceipt }));
      if (!relishAmount || relishAmount === '0') {
        const fee = termFees.find((tf: any) => tf.grade === selectedStudent?.grade || tf.grade_code === selectedStudent?.grade_code);
        setRelishAmount(String(fee?.relish_fee ?? TARGETS.relish));
      }
    }
  };

  const handleToggleOther = () => {
    const next = !otherSelected;
    setOtherSelected(next);
    if (next) {
      const defaultReceipt = getOtherDefault();
      setOtherReceipt(defaultReceipt);
      setOtherAudit(prev => ({ ...prev, defaultVal: defaultReceipt }));
    }
  };

  const cartItems = [
    ...(tuitionSelected ? [{
      label: selectedStudent && (selectedStudent.grade_code === 'form1-4' || selectedStudent.grade_code === 'form5-6' || selectedStudent.grade?.startsWith('Form'))
        ? 'Secondary School Fees'
        : 'Primary School Fees',
      type: 'tuition',
      amount: parseFloat(tuitionAmount) || 0,
      receipt: tuitionReceipt,
      paymentMethod: tuitionPaymentMethod,
    }] : []),
    ...(transportSelected ? [{
      label: 'Transport',
      type: 'transport',
      amount: parseFloat(transportAmount) || 0,
      receipt: transportReceipt,
      paymentMethod: transportPaymentMethod,
    }] : []),
    ...(uniformSelected ? [{
      label: 'Uniform',
      type: 'uniform',
      amount: parseFloat(uniformAmount) || 0,
      receipt: uniformReceipt,
      paymentMethod: uniformPaymentMethod,
    }] : []),
    ...(isECDStudent && relishSelected ? [{
      label: 'Bread & Relish',
      type: 'relish',
      amount: parseFloat(relishAmount) || 0,
      receipt: relishReceipt,
      paymentMethod: relishPaymentMethod,
    }] : []),
    ...(otherSelected ? [{
      label: 'Other',
      type: 'other',
      amount: parseFloat(otherAmount) || 0,
      receipt: otherReceipt,
      paymentMethod: otherPaymentMethod,
    }] : []),
  ];

  const cartTotal = cartItems.reduce((sum, item) => sum + item.amount, 0);

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    // Filter by type
    if (filterType !== 'all' && transaction.type !== filterType) {
      return false;
    }
    
    // Filter by level (primary/secondary)
    if (filterLevel !== 'all') {
      const grade = transaction.studentGrade || '';
      const isPrimary = ['ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(grade);
      const isSecondary = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].includes(grade);
      
      if (filterLevel === 'primary' && !isPrimary) return false;
      if (filterLevel === 'secondary' && !isSecondary) return false;
    }

    // Filter by grade range (ECD / primary school / secondary school)
    if (gradeRangeFilter !== 'all') {
      const grade = transaction.studentGrade || '';
      const isEcd = ['ECD A', 'ECD B'].includes(grade);
      const isPrimary = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'].includes(grade);
      const isSecondary = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'].includes(grade);

      if (gradeRangeFilter === 'ecd' && !isEcd) return false;
      if (gradeRangeFilter === 'primary' && !isPrimary) return false;
      if (gradeRangeFilter === 'secondary' && !isSecondary) return false;
      if (gradeRangeFilter === 'ecd-primary' && !(isEcd || isPrimary)) return false;
    }
    
    // Filter by date based on selected mode
    if (dateFilterMode !== 'all') {
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
      
      if (dateFilterMode === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (transactionDate.getTime() !== today.getTime()) return false;
      }
      
      if (dateFilterMode === 'custom' && customDate) {
        const selectedDate = new Date(customDate);
        selectedDate.setHours(0, 0, 0, 0);
        if (transactionDate.getTime() !== selectedDate.getTime()) return false;
      }
      
      if (dateFilterMode === 'term' && selectedTerm !== 'all') {
        const term = parseInt(selectedTerm);
        const month = transactionDate.getMonth() + 1;
        
        // Term 1: Jan, Feb, Mar (1, 2, 3)
        // Term 2: May, Jun, Jul (5, 6, 7)
        // Term 3: Sep, Oct, Nov (9, 10, 11)
        const termMonths: Record<number, number[]> = {
          1: [1, 2, 3],
          2: [5, 6, 7],
          3: [9, 10, 11]
        };
        
        if (!termMonths[term].includes(month)) return false;
      }
      
      if (dateFilterMode === 'year' && selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        if (transactionDate.getFullYear() !== year) return false;
      }
      
      if (dateFilterMode === 'range' && (dateRangeStart || dateRangeEnd)) {
        if (dateRangeStart) {
          const startDate = new Date(dateRangeStart);
          startDate.setHours(0, 0, 0, 0);
          if (transactionDate < startDate) return false;
        }
        
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (transactionDate > endDate) return false;
        }
      }
    }
    
    // Filter by payment method
    if (filterPaymentMethod !== 'all' && transaction.payment_method !== filterPaymentMethod) {
      return false;
    }
    
    return true;
  });

  if (loading && transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#10B981]" />
        <p className="text-muted-foreground font-['Inter']">Loading ledger dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Finance Ledger</h1>
      </div>

      {/* Payment Form */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Record New Payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Search */}
          <div className="space-y-2 relative">
            <Label htmlFor="registrationNumber" className="font-['Inter']">Registration Number/Student Name</Label>
            <Input
              id="registrationNumber"
              value={searchInput}
              onChange={(e) => handleStudentSearch(e.target.value)}
              placeholder="Enter REG# or student name..."
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              required
              autoFocus
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-[20px] shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((student) => (
                  <div
                    key={student.registration_number}
                    onClick={() => selectStudent(student)}
                    className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors border-b border-zinc-200 dark:border-zinc-800 last:border-0 font-['Inter'] text-zinc-950 dark:text-zinc-50"
                  >
                    <div className="font-semibold text-sm">{student.first_name} {student.surname}</div>
                    <div className="text-xs text-muted-foreground">{student.registration_number} · {student.grade}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Payment Analysis Matrix ─────────────────────────────────────── */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            {selectedStudent ? (
              <div className="p-5 rounded-[24px] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <h4 className="font-['Space_Grotesk'] text-lg font-bold mb-1 text-zinc-950 dark:text-zinc-50">
                  {selectedStudent.registration_number} — {selectedStudent.first_name} {selectedStudent.surname} — {selectedStudent.grade} — Payment Analysis
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

                {/* Student Lifetime Debt / Credit Summary Card */}
                {(() => {
                  const matrix = buildPaymentMatrix(mappedStudent!, studentTx, termFees);
                  const isECDStudent = selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B');
                  const totalExpected = matrix.reduce((sum, row) => 
                    sum + row.tuition.target + row.transport.target + (isECDStudent ? row.relish.target : 0) + (row.uniformItems.paid || 0),
                    0
                  );
                  const totalPaid = studentTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                  const netDiff = totalPaid - totalExpected;
                  const isDebt = netDiff < 0;
                  const isCredit = netDiff > 0;
                  const joinDateFormatted = selectedStudent.registration_date ? new Date(selectedStudent.registration_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Admission';

                  return (
                    <div className={cn(
                      "my-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all",
                      isDebt 
                        ? "bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200" 
                        : isCredit 
                          ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200"
                          : "bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          isDebt 
                            ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400" 
                            : isCredit 
                              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                        )}>
                          {isDebt ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-75 font-['Inter']">
                              {isDebt ? 'Outstanding Debt' : isCredit ? 'Account Credit / Surplus' : 'Account Status'}
                            </span>
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                              isDebt 
                                ? "bg-red-200/70 dark:bg-red-800/40 text-red-800 dark:text-red-300"
                                : isCredit 
                                  ? "bg-emerald-200/70 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300"
                                  : "bg-blue-200/70 dark:bg-blue-800/40 text-blue-800 dark:text-blue-300"
                            )}>
                              {isDebt ? 'Balance Due' : isCredit ? 'Advance Paid' : 'Settled'}
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-0.5 font-['Inter']">
                            Calculated in sync from newcomer date (<span className="font-semibold">{joinDateFormatted}</span>) till present
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right self-start sm:self-center">
                        <div>
                          <div className="text-xs opacity-75 font-['Inter']">
                            Expected: <span className="font-semibold text-zinc-800 dark:text-zinc-200">${totalExpected.toFixed(2)}</span> · Paid: <span className="font-semibold text-zinc-800 dark:text-zinc-200">${totalPaid.toFixed(2)}</span>
                          </div>
                          <div className={cn(
                            "text-lg font-bold font-['Space_Grotesk']",
                            isDebt ? "text-red-600 dark:text-red-400" : isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                          )}>
                            {isDebt ? `-$${Math.abs(netDiff).toFixed(2)} (Debt)` : isCredit ? `+$${netDiff.toFixed(2)} (Credit)` : '$0.00 (Fully Settled)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

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
                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Tuition<br/><span className="text-[9px] font-normal opacity-70">Per term</span></th>
                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Transport<br/><span className="text-[9px] font-normal opacity-70">Per term</span></th>
                        <th className="w-[30%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Uniform Purchases<br/><span className="text-[9px] font-normal opacity-70">Dress · Tracksuit · Shoes · Shirt · Shorts</span></th>
                        {selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B') && (
                          <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Relish<br/><span className="text-[9px] font-normal opacity-70">Per term</span></th>
                        )}
                        <th className="w-[16%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/30 dark:bg-zinc-800/10">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map((row) => {
                        const isECDStudent = selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B');
                        const allRecurringDone = row.tuition.complete && row.transport.complete && (!isECDStudent || row.relish.complete);
                        return (
                          <tr
                            key={row.monthKey}
                            className="transition-all duration-200 hover:bg-zinc-100/30 dark:hover:bg-zinc-800/10"
                          >
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

                            <td className="p-1 align-top border-b border-r border-zinc-200 dark:border-zinc-800">
                              <UniformStack col={row.uniformItems} />
                            </td>

                            {isECDStudent && (
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
                            )}

                            <td className="p-2 align-top text-center font-['Space_Grotesk'] text-xs font-bold border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">
                              ${isECDStudent ? row.rowTotal : (row.tuition.paid + row.transport.paid + row.uniformItems.paid)}
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
                            ...(isECDStudent ? [{ val: grandTotals.relish }] : []),
                          ]
                        ).map((col, i) => (
                          <td key={i} className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                            <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                              <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${col.val}</div>
                            </div>
                          </td>
                        ))}
                        <td className="p-2 text-center font-['Space_Grotesk'] text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">
                          ${isECDStudent ? grandTotals.total : (grandTotals.tuition + grandTotals.transport + grandTotals.uniformItems)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Academic History Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="text-xs text-muted-foreground font-['Inter']">
                    Showing:{' '}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {`Months ${monthPage * 12 + 1}–${Math.min((monthPage + 1) * 12, paymentMatrix.length)} of ${paymentMatrix.length} academic months`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={monthPage === 0}
                      onClick={() => setMonthPage(prev => prev - 1)}
                      className="rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-['Inter'] flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Forward (Newer)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={(monthPage + 1) * 12 >= paymentMatrix.length}
                      onClick={() => setMonthPage(prev => prev + 1)}
                      className="rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-['Inter'] flex items-center gap-1.5 disabled:opacity-40"
                    >
                      Back (Older)
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
                  Enter a registration number or student name to select and view payment analysis
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
                disabled
                placeholder="Auto-filled from search"
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981] opacity-70"
              />
            </div>
          </div>

          {/* Main Grid: Cards on Left (2 cols on lg), Cart on Right (1 col on lg) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Payment Type Cards (Left Column) */}
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
              {/* Tuition Card */}
              <div
                className={`${paymentCardBase} ${paymentCardTuition}`}
                onClick={handleToggleTuition}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${tuitionSelected ? tuitionBadgeSelected : tuitionBadgeBase}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-graduation-cap w-5 h-5"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">
                        {selectedStudent && (selectedStudent.grade_code === 'form1-4' || selectedStudent.grade_code === 'form5-6' || selectedStudent.grade?.startsWith('Form'))
                          ? 'Secondary School Fees'
                          : 'Primary School Fees'}
                      </h3>
                      <p className="text-xs text-muted-foreground font-['Inter']">
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>, Tuition
                      </p>
                    </div>
                    {tuitionSelected && (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <Label htmlFor="tuitionPaymentMethod" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Payment Method</Label>
                        <Select value={tuitionPaymentMethod} onValueChange={setTuitionPaymentMethod}>
                          <SelectTrigger className={`${inputBaseClass} ${tuitionInputFocus}`}>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="ecocash">EcoCash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {tuitionSelected && (
                    <div className="flex-1 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label htmlFor="tuitionReceipt" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Receipt #</Label>
                        <Input
                          id="tuitionReceipt"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={tuitionReceipt}
                          onChange={(e) => handleReceiptChange(e.target.value, setTuitionReceipt, tuitionAudit.defaultVal || getTuitionDefault(), setTuitionAudit)}
                          className={`${inputBaseClass} ${tuitionInputFocus}`}
                        />
                        {tuitionAudit.isOpen && (
                          <ReceiptAuditBox
                            defaultVal={tuitionAudit.defaultVal || getTuitionDefault()}
                            currentVal={tuitionReceipt}
                            changedBy={tuitionAudit.changedBy}
                            setChangedBy={(v) => setTuitionAudit(prev => ({ ...prev, changedBy: v }))}
                            reason={tuitionAudit.reason}
                            setReason={(v) => setTuitionAudit(prev => ({ ...prev, reason: v }))}
                            onApply={() => setTuitionAudit(prev => ({ ...prev, isOpen: false, isApplied: true }))}
                            onCancel={() => {
                              const def = tuitionAudit.defaultVal || getTuitionDefault();
                              setTuitionReceipt(def);
                              setTuitionAudit(prev => ({ ...prev, isOpen: false, isApplied: false, changedBy: '', reason: '' }));
                            }}
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="tuitionAmount" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Amount ($)</Label>
                        <Input
                          id="tuitionAmount"
                          type="number"
                          value={tuitionAmount}
                          onChange={(e) => setTuitionAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputBaseClass} ${tuitionInputFocus}`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${tuitionSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-white/20'}`} />
                  </div>
                </div>
              </div>

              {/* Transport Card */}
              <div
                className={`${paymentCardBase} ${paymentCardTransport}`}
                onClick={handleToggleTransport}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${transportSelected ? transportBadgeSelected : transportBadgeBase}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bus w-5 h-5"><path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"></path><path d="M4 17h16"></path><path d="M7 17v2"></path><path d="M17 17v2"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h8"></path></svg>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Transport</h3>
                      <p className="text-xs text-muted-foreground font-['Inter']">
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>, Transport
                      </p>
                    </div>
                    {transportSelected && (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <Label htmlFor="transportPaymentMethod" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Payment Method</Label>
                        <Select value={transportPaymentMethod} onValueChange={setTransportPaymentMethod}>
                          <SelectTrigger className={`${inputBaseClass} ${transportInputFocus}`}>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="ecocash">EcoCash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {transportSelected && (
                    <div className="flex-1 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label htmlFor="transportReceipt" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Receipt #</Label>
                        <Input
                          id="transportReceipt"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={transportReceipt}
                          onChange={(e) => handleReceiptChange(e.target.value, setTransportReceipt, transportAudit.defaultVal || getTransportDefault(), setTransportAudit)}
                          className={`${inputBaseClass} ${transportInputFocus}`}
                        />
                        {transportAudit.isOpen && (
                          <ReceiptAuditBox
                            defaultVal={transportAudit.defaultVal || getTransportDefault()}
                            currentVal={transportReceipt}
                            changedBy={transportAudit.changedBy}
                            setChangedBy={(v) => setTransportAudit(prev => ({ ...prev, changedBy: v }))}
                            reason={transportAudit.reason}
                            setReason={(v) => setTransportAudit(prev => ({ ...prev, reason: v }))}
                            onApply={() => setTransportAudit(prev => ({ ...prev, isOpen: false, isApplied: true }))}
                            onCancel={() => {
                              const def = transportAudit.defaultVal || getTransportDefault();
                              setTransportReceipt(def);
                              setTransportAudit(prev => ({ ...prev, isOpen: false, isApplied: false, changedBy: '', reason: '' }));
                            }}
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="transportAmount" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Amount ($)</Label>
                        <Input
                          id="transportAmount"
                          type="number"
                          value={transportAmount}
                          onChange={(e) => setTransportAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputBaseClass} ${transportInputFocus}`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${transportSelected ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-white/20'}`} />
                  </div>
                </div>
              </div>

              {/* Uniform Card */}
              <div
                className={`${paymentCardBase} ${paymentCardUniform}`}
                onClick={handleToggleUniform}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${uniformSelected ? uniformBadgeSelected : uniformBadgeBase}`}>
                      <Shirt className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Uniform</h3>
                      <p className="text-xs text-muted-foreground font-['Inter']">
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>, Uniform
                      </p>
                    </div>
                    {uniformSelected && (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <Label htmlFor="uniformPaymentMethod" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Payment Method</Label>
                        <Select value={uniformPaymentMethod} onValueChange={setUniformPaymentMethod}>
                          <SelectTrigger className={`${inputBaseClass} ${uniformInputFocus}`}>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="ecocash">EcoCash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {uniformSelected && (
                    <div className="flex-1 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label htmlFor="uniformReceipt" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Receipt #</Label>
                        <Input
                          id="uniformReceipt"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={uniformReceipt}
                          onChange={(e) => handleReceiptChange(e.target.value, setUniformReceipt, uniformAudit.defaultVal || getUniformDefault(), setUniformAudit)}
                          className={`${inputBaseClass} ${uniformInputFocus}`}
                        />
                        {uniformAudit.isOpen && (
                          <ReceiptAuditBox
                            defaultVal={uniformAudit.defaultVal || getUniformDefault()}
                            currentVal={uniformReceipt}
                            changedBy={uniformAudit.changedBy}
                            setChangedBy={(v) => setUniformAudit(prev => ({ ...prev, changedBy: v }))}
                            reason={uniformAudit.reason}
                            setReason={(v) => setUniformAudit(prev => ({ ...prev, reason: v }))}
                            onApply={() => setUniformAudit(prev => ({ ...prev, isOpen: false, isApplied: true }))}
                            onCancel={() => {
                              const def = uniformAudit.defaultVal || getUniformDefault();
                              setUniformReceipt(def);
                              setUniformAudit(prev => ({ ...prev, isOpen: false, isApplied: false, changedBy: '', reason: '' }));
                            }}
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="uniformAmount" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Amount ($)</Label>
                        <Input
                          id="uniformAmount"
                          type="number"
                          value={uniformAmount}
                          onChange={(e) => setUniformAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputBaseClass} ${uniformInputFocus}`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${uniformSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300 dark:border-white/20'}`} />
                  </div>
                </div>
              </div>

              {/* Relish Card (Only for ECD A and ECD B Primary students) */}
              {isECDStudent && (
                <div
                  className={`${paymentCardBase} ${paymentCardRelish}`}
                  onClick={handleToggleRelish}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-3">
                      <div className={`p-3 rounded-full ${relishSelected ? relishBadgeSelected : relishBadgeBase}`}>
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Bread &amp; Relish</h3>
                        <p className="text-xs text-muted-foreground font-['Inter']">
                          <span className="font-bold text-zinc-700 dark:text-zinc-200">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>, Relish (ECD)
                        </p>
                      </div>
                      {relishSelected && (
                        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                          <Label htmlFor="relishPaymentMethod" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Payment Method</Label>
                          <Select value={relishPaymentMethod} onValueChange={setRelishPaymentMethod}>
                            <SelectTrigger className={`${inputBaseClass} ${relishInputFocus}`}>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="ecocash">EcoCash</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {relishSelected && (
                      <div className="flex-1 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <Label htmlFor="relishReceipt" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Receipt #</Label>
                          <Input
                            id="relishReceipt"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={relishReceipt}
                            onChange={(e) => handleReceiptChange(e.target.value, setRelishReceipt, relishAudit.defaultVal || getRelishDefault(), setRelishAudit)}
                            className={`${inputBaseClass} ${relishInputFocus}`}
                          />
                          {relishAudit.isOpen && (
                            <ReceiptAuditBox
                              defaultVal={relishAudit.defaultVal || getRelishDefault()}
                              currentVal={relishReceipt}
                              changedBy={relishAudit.changedBy}
                              setChangedBy={(v) => setRelishAudit(prev => ({ ...prev, changedBy: v }))}
                              reason={relishAudit.reason}
                              setReason={(v) => setRelishAudit(prev => ({ ...prev, reason: v }))}
                              onApply={() => setRelishAudit(prev => ({ ...prev, isOpen: false, isApplied: true }))}
                              onCancel={() => {
                                const def = relishAudit.defaultVal || getRelishDefault();
                                setRelishReceipt(def);
                                setRelishAudit(prev => ({ ...prev, isOpen: false, isApplied: false, changedBy: '', reason: '' }));
                              }}
                            />
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="relishAmount" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Amount ($)</Label>
                          <Input
                            id="relishAmount"
                            type="number"
                            value={relishAmount}
                            onChange={(e) => setRelishAmount(e.target.value)}
                            placeholder="0.00"
                            className={`${inputBaseClass} ${relishInputFocus}`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${relishSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300 dark:border-white/20'}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Other Card */}
              <div 
                className={`${paymentCardBase} ${paymentCardOther}`}
                onClick={handleToggleOther}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-full ${otherSelected ? otherBadgeSelected : otherBadgeBase}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wallet w-5 h-5"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path><path d="M16 11h3a2 2 0 0 1 2 2v2H16"></path><path d="M4 7h13"></path></svg>
                    </div>
                    <div>
                      <h3 className="font-['Space_Grotesk'] font-semibold text-sm leading-tight text-zinc-950 dark:text-zinc-50">Other</h3>
                      <p className="text-xs text-muted-foreground font-['Inter']">
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>, Other
                      </p>
                    </div>
                    {otherSelected && (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <Label htmlFor="otherPaymentMethod" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Payment Method</Label>
                        <Select value={otherPaymentMethod} onValueChange={setOtherPaymentMethod}>
                          <SelectTrigger className={`${inputBaseClass} ${otherInputFocus}`}>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="ecocash">EcoCash</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {otherSelected && (
                    <div className="flex-1 ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1">
                        <Label htmlFor="otherReceipt" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Receipt #</Label>
                        <Input
                          id="otherReceipt"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={otherReceipt}
                          onChange={(e) => handleReceiptChange(e.target.value, setOtherReceipt, otherAudit.defaultVal || getOtherDefault(), setOtherAudit)}
                          className={`${inputBaseClass} ${otherInputFocus}`}
                        />
                        {otherAudit.isOpen && (
                          <ReceiptAuditBox
                            defaultVal={otherAudit.defaultVal || getOtherDefault()}
                            currentVal={otherReceipt}
                            changedBy={otherAudit.changedBy}
                            setChangedBy={(v) => setOtherAudit(prev => ({ ...prev, changedBy: v }))}
                            reason={otherAudit.reason}
                            setReason={(v) => setOtherAudit(prev => ({ ...prev, reason: v }))}
                            onApply={() => setOtherAudit(prev => ({ ...prev, isOpen: false, isApplied: true }))}
                            onCancel={() => {
                              const def = otherAudit.defaultVal || getOtherDefault();
                              setOtherReceipt(def);
                              setOtherAudit(prev => ({ ...prev, isOpen: false, isApplied: false, changedBy: '', reason: '' }));
                            }}
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="otherAmount" className="font-['Inter'] text-[11px] text-gray-700 dark:text-gray-300">Amount ($)</Label>
                        <Input
                          id="otherAmount"
                          type="number"
                          value={otherAmount}
                          onChange={(e) => setOtherAmount(e.target.value)}
                          placeholder="0.00"
                          className={`${inputBaseClass} ${otherInputFocus}`}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${otherSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300 dark:border-white/20'}`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Cart (Right Column) */}
            <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-6">
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-2 border-gray-200 dark:border-gray-700">
                <h3 className="font-['Space_Grotesk'] text-lg font-semibold mb-3 text-gray-600 dark:text-gray-400">Payment Cart</h3>
                <div className="space-y-2">
                  {cartItems.length > 0 ? (
                    cartItems.map((item) => (
                      <div key={item.type} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-200/60 dark:border-gray-700/60 last:border-0">
                        <div className="flex flex-col">
                          <span className="font-['Inter'] font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                          <span className="text-xs text-muted-foreground font-['Inter']">
                            {item.paymentMethod.toUpperCase()} · #{item.receipt || 'Auto'}
                          </span>
                        </div>
                        <span className="font-semibold font-['Space_Grotesk'] text-zinc-900 dark:text-zinc-100">${item.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground font-['Inter'] text-sm">
                      <p>No items in cart</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Select cards on the left to add items</p>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-300 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="font-['Space_Grotesk'] font-semibold text-gray-600 dark:text-gray-400">Total</span>
                      <span className="text-xl font-bold font-['Space_Grotesk'] text-zinc-900 dark:text-zinc-100">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={cartItems.length === 0 || !selectedStudent}
                className="w-full rounded-[20px] bg-[#10B981] hover:bg-[#059669] text-white h-12 font-['Space_Grotesk'] shadow-sm disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Record Payment {cartTotal > 0 ? `($${cartTotal.toFixed(2)})` : ''}
              </Button>
            </div>
          </div>
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
                  <h4 className="font-['Space_Grotesk'] text-lg text-blue-600 dark:text-blue-400">{selectedStudent.first_name} {selectedStudent.surname}</h4>
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
              <h4 className="font-['Space_Grotesk'] text-lg mb-3">Payment Summary</h4>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {Object.entries(getMonthlyPaymentSummary(selectedStudent)).map(([month, data]) => (
                  <div key={month} className="p-4 rounded-[20px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium font-['Inter']">{month}</span>
                      <span className="text-sm text-muted-foreground font-['Inter']">
                        {data.tuition.length + data.uniform.length + (selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B') ? data.relish.length : 0) + data.other.length} payment{(data.tuition.length + data.uniform.length + (selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B') ? data.relish.length : 0) + data.other.length) > 1 ? 's' : ''}
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
                              {payment.uniformSize && (
                                <span className="text-xs text-muted-foreground font-['Inter']">Size: {payment.uniformSize}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedStudent && (selectedStudent.grade === 'ECD A' || selectedStudent.grade === 'ECD B') && data.relish.length > 0 && (
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
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div className="space-y-2">
            <Label className="font-['Inter']">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="tuition">Tuition</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="uniform">Uniform</SelectItem>
                <SelectItem value="relish">Relish</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="font-['Inter']">Filter by Level</Label>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-['Inter']">Grade Range</Label>
            <Select value={gradeRangeFilter} onValueChange={setGradeRangeFilter}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="ecd">ECD A-B</SelectItem>
                <SelectItem value="primary">Grade 1-7</SelectItem>
                <SelectItem value="secondary">Form 1-6</SelectItem>
                <SelectItem value="ecd-primary">ECD + Primary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="font-['Inter']">Date Filter</Label>
            <Select value={dateFilterMode} onValueChange={setDateFilterMode}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                <SelectValue placeholder="Select date filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="custom">Select Any Date</SelectItem>
                <SelectItem value="term">Select Term</SelectItem>
                <SelectItem value="year">Select Year</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Conditional date inputs based on selection */}
            {dateFilterMode === 'custom' && (
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200 mt-2"
              />
            )}
            
            {dateFilterMode === 'term' && (
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="mt-2 rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Terms</SelectItem>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {dateFilterMode === 'year' && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="mt-2 rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            
            {dateFilterMode === 'range' && (
              <div className="flex gap-2 mt-2">
                <Input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200"
                />
                <Input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200"
                />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="font-['Inter']">Payment Method</Label>
            <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
              <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="ecocash">Ecocash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
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
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981]">#{transaction.receipt_number}</TableCell>
                  <TableCell className="font-['Inter']">{transaction.studentName}</TableCell>
                  <TableCell className="font-['Inter'] text-muted-foreground">{transaction.studentGrade}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                      transaction.type === 'tuition' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                      transaction.type === 'uniform' ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' :
                      transaction.type === 'relish'  ? 'bg-[#10B981]/10 text-[#10B981]' :
                                                       'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}>
                      {transaction.type === 'other' ? transaction.other_payment_name : transaction.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-right">${transaction.amount}</TableCell>
                  <TableCell className="font-['Inter'] text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                      transaction.payment_method === 'cash'    ? 'bg-green-100  text-green-800  dark:bg-green-900/20  dark:text-green-400' :
                      transaction.payment_method === 'ecocash' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                                                'bg-blue-100   text-blue-800   dark:bg-blue-900/20   dark:text-blue-400'
                    }`}>
                      {transaction.payment_method}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground font-['Inter']">
                    {transactions.length === 0 ? 'No transactions logged yet' : 'No transactions match your filters'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
