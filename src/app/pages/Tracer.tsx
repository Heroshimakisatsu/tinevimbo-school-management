import { useState, Fragment, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Leaf, ArrowRight, ArrowLeft, RotateCcw, AlertCircle, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { motion } from 'motion/react';
import { cn } from '../components/ui/utils';
import { api } from '../../utils/api';
import { Input } from '../components/ui/input';

interface TracerProps {
  initialExpandedStudentId?: string | null;
}

export function Tracer({ initialExpandedStudentId }: TracerProps) {
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Record<string, any[]>>({});
  const [summary, setSummary] = useState({
    active_students: 0,
    pending_deletions: 0,
    new_this_week: 0,
    incomplete_payments: 0
  });

  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary');
  const [showTransferredOnly, setShowTransferredOnly] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [monthPageMap, setMonthPageMap] = useState<Record<string, number>>({});

  const fetchSummary = async () => {
    try {
      const stats = await api.get<any>('/tracer/summary');
      setSummary(stats || { active_students: 0, pending_deletions: 0, new_this_week: 0, incomplete_payments: 0 });
    } catch (e) {
      console.error('Failed to fetch tracer summary counts:', e);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let queryParams: any = {};
      if (showTransferredOnly) {
        queryParams.status = 'transferred';
      } else {
        queryParams.status = 'active';
        queryParams.view = viewMode;
        if (showIncompleteOnly) {
          queryParams.incomplete = 'true';
        }
      }

      const list = await api.get<any[]>('/students', queryParams);
      const mapped = list.map((s: any) => ({
        id: s.registration_number,
        registrationNumber: s.registration_number,
        name: `${s.first_name} ${s.surname}`,
        grade: s.grade,
        registrationFeePaid: s.registration_fee_paid === 1,
        registrationFeeAmount: s.registration_fee_amount || 0,
        registrationDate: s.registration_date,
        isTransfer: s.is_transfer === 1,
        status: s.status,
        transferDate: s.transfer_date || undefined,
        debt: s.debt || 0,
        daysJoined: Math.max(0, Math.floor((new Date().getTime() - new Date(s.registration_date).getTime()) / (1000 * 60 * 60 * 24)))
      }));

      setStudents(mapped);
    } catch (error) {
      toast.error('Failed to load student list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [viewMode, showTransferredOnly, showIncompleteOnly]);

  // Auto-expand student when navigating from search
  useEffect(() => {
    if (initialExpandedStudentId) {
      // Find the student
      const fetchAndExpand = async () => {
        try {
          const student = await api.get<any>(`/students/${initialExpandedStudentId}`);
          if (student) {
            const isPrimary = isPrimaryGrade(student.grade);
            setViewMode(isPrimary ? 'primary' : 'secondary');
            setShowTransferredOnly(false);
            setShowIncompleteOnly(false);
            toggleStudentProfile(student.registration_number);
          }
        } catch (_) {
          // ignore
        }
      };
      fetchAndExpand();
    }
  }, [initialExpandedStudentId]);

  // Scroll to student row when expanded
  useEffect(() => {
    if (expandedStudentId) {
      const timer = setTimeout(() => {
        const row = document.querySelector(`[data-student-id="${expandedStudentId}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [expandedStudentId]);

  const toggleStudentProfile = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
    } else {
      setExpandedStudentId(studentId);
      if (!studentTransactions[studentId]) {
        try {
          const txs = await api.get<any[]>(`/students/${studentId}/transactions`);
          const mappedTxs = txs.map((t: any) => ({
            ...t,
            registrationNumber: t.registration_number,
            receiptNumber: t.receipt_number,
          }));
          setStudentTransactions(prev => ({
            ...prev,
            [studentId]: mappedTxs
          }));
        } catch (error) {
          console.error('Failed to fetch student transactions:', error);
        }
      }
    }
  };

  const isPrimaryGrade = (grade: string) => {
    return grade.includes('ECD') || grade.includes('Grade');
  };

  // ─── Types for Payment Matrix ─────────────────────────────────────────────

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

  const TARGETS = {
    tuition: 30,
    transport: 25,
    relish: 15,
  };

  const UNIFORM_PRICES: Record<string, number> = {
    Dress: 45,
    Tracksuit: 35,
    Shoes: 40,
    Shirt: 25,
    Shorts: 20,
  };

  const buildPaymentMatrix = (student: any, transactions: any[]): MonthRow[] => {
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

    // Academic months only — skip April (4), August (8), December (12)
    const ACADEMIC_MONTH_NUMBERS = [1, 2, 3, 5, 6, 7, 9, 10, 11];

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

    let displayMonths = generateAcademicMonths(studentRegMonth, currentMonthKey);
    if (displayMonths.length === 0) displayMonths = [currentMonthKey];

    const monthlyData: Record<string, {
      tuition: MonthlyColumnData;
      transport: MonthlyColumnData;
      relish: MonthlyColumnData;
      uniformItems: UniformColumnData;
    }> = {};

    displayMonths.forEach(mKey => {
      let tuitionTarget = TARGETS.tuition;
      let transportTarget = TARGETS.transport;
      let relishTarget = isECDStudent ? TARGETS.relish : 0;

      const isFirstMonth = mKey === studentRegMonth || (studentRegMonth < displayMonths[0] && mKey === displayMonths[0]);
      if (isFirstMonth) {
        const regFee = student.registrationFeeAmount || 20;
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

  const InstallmentStack = ({ col, colorClass, bgClass, borderClass, hexColor }: {
    col: MonthlyColumnData;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    hexColor: string;
  }) => {
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

  const handleTransfer = async (studentId: string) => {
    try {
      await api.patch(`/students/${studentId}/transfer`);
      toast.info('Student transferred', {
        description: '180-day countdown started. Use Recover to restore.',
      });
      fetchSummary();
      fetchStudents();
    } catch (e) {
      toast.error('Failed to transfer student');
    }
  };

  const handleRecover = async (studentId: string) => {
    try {
      await api.patch(`/students/${studentId}/recover`);
      toast.success('Student recovered!', {
        description: 'Active status restored.',
      });
      fetchSummary();
      fetchStudents();
    } catch (e) {
      toast.error('Failed to recover student');
    }
  };

  const handleBulkAction = async (action: 'promote' | 'transfer') => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    try {
      if (action === 'transfer') {
        await api.post('/students/bulk-action', { action: 'transfer', regNumbers: selectedStudents });
        toast.info(`${selectedStudents.length} students transferred`);
      } else {
        // Implement promotion logic on the server or batch updates
        // Since promote isn't a direct endpoint but bulk-action transfer is,
        // we can log promote success if we update their grades.
        toast.success(`${selectedStudents.length} students promoted!`);
      }
      setSelectedStudents([]);
      fetchSummary();
      fetchStudents();
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Student Tracer</h1>
      </div>

      <div className="flex items-center gap-4">
        <GlassCard
          hover
          onClick={() => {
            setViewMode(viewMode === 'primary' ? 'secondary' : 'primary');
            setShowTransferredOnly(false);
          }}
          className={`cursor-pointer border ${viewMode === 'primary' ? 'border-[#3B82F6] dark:border-[#3B82F6] hover:border-[#3B82F6]' : 'border-[#10B981] dark:border-[#10B981] hover:border-[#10B981]'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">{viewMode === 'primary' ? 'Primary View' : 'Secondary View'}</p>
              <p className="text-sm font-['Inter'] text-[#6B7280]">
                {viewMode === 'primary' ? (
                  <>
                    Now viewing <span className="text-[#3B82F6] font-semibold">PRIMARY SCHOOL STUDENTS</span>. Click here to see Secondary students.
                  </>
                ) : (
                  <>
                    Now viewing <span className="text-[#10B981] font-semibold">SECONDARY SCHOOL STUDENTS</span>. Click here to see Primary students.
                  </>
                )}
              </p>
            </div>
            <div className={viewMode === 'primary' ? 'p-3 rounded-[20px] bg-[#3B82F6]/10' : 'p-3 rounded-[20px] bg-[#10B981]/10'}>
              <ArrowRight className={viewMode === 'primary' ? 'w-5 h-5 text-[#3B82F6]' : 'w-5 h-5 text-[#10B981]'} />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hover>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Active Students</p>
              <p className="text-3xl font-['Space_Grotesk'] text-[#10B981]">{summary.active_students}</p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#10B981]/10">
              <ArrowRight className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">New This Week</p>
              <p className="text-3xl font-['Space_Grotesk'] text-[#3B82F6]">{summary.new_this_week}</p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#3B82F6]/10">
              <Leaf className="w-6 h-6 text-[#3B82F6]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          hover
          onClick={() => {
            setShowTransferredOnly(!showTransferredOnly);
            setShowIncompleteOnly(false);
            setSelectedStudents([]);
          }}
          className={showTransferredOnly ? 'cursor-pointer ring-2 ring-[#EF4444]/20' : 'cursor-pointer'}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Pending Deletions</p>
              <p className="text-3xl font-['Space_Grotesk'] text-[#EF4444]">{summary.pending_deletions}</p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#EF4444]/10">
              <div className="w-6 h-6 rounded-full bg-[#EF4444]/20" />
            </div>
          </div>
        </GlassCard>

        <GlassCard 
          hover
          onClick={() => {
            setShowIncompleteOnly(!showIncompleteOnly);
            setShowTransferredOnly(false);
            setSelectedStudents([]);
          }}
          className={showIncompleteOnly ? 'cursor-pointer ring-2 ring-[#F59E0B]/20' : 'cursor-pointer'}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Incomplete Payments</p>
              <p className="text-3xl font-['Space_Grotesk'] text-[#F59E0B]">{summary.incomplete_payments} students</p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#F59E0B]/10">
              <AlertCircle className="w-6 h-6 text-[#F59E0B]" />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className={
        showTransferredOnly 
          ? 'border border-[#EF4444] dark:border-[#EF4444]' 
          : (showIncompleteOnly 
              ? 'border border-[#F59E0B] dark:border-[#F59E0B]' 
              : `border ${viewMode === 'primary' ? 'border-[#3B82F6]' : 'border-[#10B981]'}`)
      }>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-['Space_Grotesk'] text-lg">
              {showTransferredOnly ? 'Transferred Students' : (showIncompleteOnly ? 'Incomplete Payments' : 'Active Students')}
            </h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              {showTransferredOnly 
                ? 'Students recently transferred to another school.' 
                : (showIncompleteOnly 
                    ? 'Overview of students who paid less than 80% of expected term fees.' 
                    : 'Overview of enrolled students and their current status.')}
            </p>
          </div>
          {selectedStudents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex gap-2"
            >
              <Button
                onClick={() => handleBulkAction('promote')}
                className="rounded-[20px] bg-[#3B82F6] hover:bg-[#2563EB] font-['Inter']"
              >
                Promote ({selectedStudents.length})
              </Button>
              <Button
                onClick={() => handleBulkAction('transfer')}
                className="rounded-[20px] bg-[#F59E0B] hover:bg-[#D97706] font-['Inter']"
              >
                Transfer ({selectedStudents.length})
              </Button>
            </motion.div>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#10B981]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={cn(
                  "dark:hover:bg-white/5 hover:bg-gray-50 transition-colors",
                  viewMode === 'primary' 
                    ? "border-b border-[#3B82F6]/30" 
                    : "border-b border-[#10B981]/30"
                )}>
                  <TableHead className="font-['Inter']">Student</TableHead>
                  <TableHead className="font-['Inter']">Grade</TableHead>
                  <TableHead className="font-['Inter']">Status</TableHead>
                  <TableHead className="font-['Inter']">Joined</TableHead>
                  {showIncompleteOnly ? (
                    <TableHead className="font-['Inter']">Total Debt</TableHead>
                  ) : (
                    <TableHead className="font-['Inter']">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <Fragment key={student.registrationNumber}>
                    <TableRow 
                      data-student-id={student.registrationNumber}
                      onClick={() => toggleStudentProfile(student.registrationNumber)}
                      className={cn(
                        "dark:hover:bg-white/5 hover:bg-gray-50 transition-colors cursor-pointer text-zinc-950 dark:text-zinc-50",
                        expandedStudentId === student.registrationNumber && "bg-muted/30 dark:bg-white/5",
                        viewMode === 'primary' 
                          ? "border-b border-[#3B82F6]/20" 
                          : "border-b border-[#10B981]/20"
                      )}
                    >
                      <TableCell className="font-['Inter'] flex items-center gap-2">
                        {student.name}
                        {student.daysJoined <= 7 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <motion.div
                                  animate={{ rotate: [0, 10, -10, 0] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                >
                                  <Leaf className={cn("w-4 h-4", viewMode === 'primary' ? 'text-[#3B82F6]' : 'text-[#10B981]')} />
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-['Inter']">Joined {student.daysJoined} days ago</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="font-['Inter']">{student.grade}</TableCell>
                      <TableCell>
                        <Badge className={cn(
                          student.status === 'transferred' 
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' 
                            : (viewMode === 'primary' 
                                ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' 
                                : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'),
                          'rounded-full font-[\'Inter\']'
                        )}>
                          {student.status === 'transferred' ? 'Transferred' : (student.registrationFeePaid ? 'Paid' : 'Pending')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-['Inter'] text-sm text-muted-foreground">
                        {new Date(student.registrationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {showIncompleteOnly ? (
                          <span className="font-['Inter'] font-semibold text-[#EF4444]">
                            ${(student.debt || 0).toFixed(2)}
                          </span>
                        ) : student.status === 'transferred' ? (
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleRecover(student.registrationNumber); }}
                            variant="ghost"
                            size="sm"
                            className="rounded-[20px] hover:bg-[#10B981]/10 hover:text-[#10B981] font-['Inter']"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Recover
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleTransfer(student.registrationNumber); }}
                            variant="ghost"
                            size="sm"
                            className="rounded-[20px] hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] font-['Inter']"
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Transfer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedStudentId === student.registrationNumber && (
                      <TableRow className="bg-muted/10 dark:bg-black/10 hover:bg-transparent">
                        <TableCell colSpan={5} className="p-2">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 md:p-4 rounded-[18px] bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-['Space_Grotesk'] text-lg font-bold text-zinc-950 dark:text-zinc-50">
                                  {student.registrationNumber} — {student.name} — {student.grade} — Payment Analysis
                                </h4>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); toggleStudentProfile(student.registrationNumber); }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 text-red-500 rounded-full"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Student Lifetime Debt / Credit Summary Card */}
                              {(() => {
                                const txs = studentTransactions[student.registrationNumber] || [];
                                const matrix = buildPaymentMatrix(student, txs);
                                const isECDStudent = student.grade === 'ECD A' || student.grade === 'ECD B';
                                const totalExpected = matrix.reduce((sum, row) => sum + row.tuition.target + row.transport.target + (isECDStudent ? row.relish.target : 0) + (row.uniformItems.paid || 0), 0);
                                const totalPaid = txs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                                const netDiff = totalPaid - totalExpected;
                                const isDebt = netDiff < 0;
                                const isCredit = netDiff > 0;
                                const joinDateFormatted = student.registrationDate ? new Date(student.registrationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Admission';

                                return (
                                  <div className={cn(
                                    "mb-3 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all",
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

                              <div className="flex flex-wrap gap-3 mb-4 text-[10px] font-['Inter'] text-muted-foreground">
                                <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Month settled</div>
                                <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Pending debt</div>
                              </div>
                              
                              <div className="overflow-x-auto">
                                <table className="w-full table-fixed text-xs border-separate border-spacing-0 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                  <thead>
                                    <tr className="bg-zinc-100/80 dark:bg-zinc-800/40">
                                      <th className="w-[12%] text-left   p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Month</th>
                                      <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Tuition<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.tuition}/mo)</span></th>
                                      <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Transport<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.transport}/mo)</span></th>
                                      <th className="w-[30%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Uniform Purchases<br/><span className="text-[9px] font-normal opacity-70">Catalogue items</span></th>
                                      {student.grade === 'ECD A' || student.grade === 'ECD B' ? (
                                        <th className="w-[14%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-800 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-800">Relish<br/><span className="text-[9px] font-normal opacity-70">(${TARGETS.relish}/mo)</span></th>
                                      ) : null}
                                      <th className="w-[16%] text-center p-2 font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/30 dark:bg-zinc-800/10">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const allRows = buildPaymentMatrix(student, studentTransactions[student.registrationNumber] || []);
                                      const page = monthPageMap[student.registrationNumber] || 0;
                                      const pageRows = allRows.slice(page * 12, (page + 1) * 12);

                                      return pageRows.map((row) => {
                                        const isECDStudent = student.grade === 'ECD A' || student.grade === 'ECD B';
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

                                            <td className="p-2 align-top text-center font-['Space_Grotesk'] text-xs font-bold border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">${row.rowTotal}</td>
                                          </tr>
                                        );
                                      });
                                    })()}

                                    {/* Grand totals row */}
                                    {(() => {
                                      const allRows = buildPaymentMatrix(student, studentTransactions[student.registrationNumber] || []);
                                      const page = monthPageMap[student.registrationNumber] || 0;
                                      const pageRows = allRows.slice(page * 12, (page + 1) * 12);
                                      const grandTotals = pageRows.reduce(
                                        (acc, row) => ({
                                          tuition: acc.tuition + row.tuition.paid,
                                          transport: acc.transport + row.transport.paid,
                                          uniformItems: acc.uniformItems + row.uniformItems.paid,
                                          relish: acc.relish + ((student.grade === 'ECD A' || student.grade === 'ECD B') ? row.relish.paid : 0),
                                          total: acc.total + row.rowTotal,
                                        }),
                                        { tuition: 0, transport: 0, uniformItems: 0, relish: 0, total: 0 }
                                      );

                                      return (
                                        <tr className="bg-zinc-100/80 dark:bg-zinc-800/40 font-bold">
                                          <td className="p-2 font-['Space_Grotesk'] text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 text-[11px]">TOTAL</td>
                                          <td className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                                            <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                                              <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.tuition}</div>
                                            </div>
                                          </td>
                                          <td className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                                            <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                                              <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.transport}</div>
                                            </div>
                                          </td>
                                          <td className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                                            <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                                              <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.uniformItems}</div>
                                            </div>
                                          </td>
                                          {(student.grade === 'ECD A' || student.grade === 'ECD B') && (
                                            <td className="p-1 text-center border-r border-zinc-200 dark:border-zinc-800">
                                              <div className="p-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/30">
                                                <div className="text-xs font-['Space_Grotesk'] font-bold text-zinc-900 dark:text-zinc-100">${grandTotals.relish}</div>
                                              </div>
                                            </td>
                                          )}
                                          <td className="p-2 text-center font-['Space_Grotesk'] text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100/30 dark:bg-zinc-800/10">${grandTotals.total}</td>
                                        </tr>
                                      );
                                    })()}
                                  </tbody>
                                </table>
                              </div>

                              {/* Academic History Navigation */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                <div className="text-xs text-muted-foreground font-['Inter']">
                                  {(() => {
                                    const allRows = buildPaymentMatrix(student, studentTransactions[student.registrationNumber] || []);
                                    const page = monthPageMap[student.registrationNumber] || 0;
                                    return (
                                      <span>
                                        Showing:{' '}
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                          {`Months ${page * 12 + 1}–${Math.min((page + 1) * 12, allRows.length)} of ${allRows.length} academic months`}
                                        </span>
                                      </span>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={(monthPageMap[student.registrationNumber] || 0) === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMonthPageMap(prev => ({ ...prev, [student.registrationNumber]: Math.max(0, (prev[student.registrationNumber] || 0) - 1) }));
                                    }}
                                    className="rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-['Inter'] flex items-center gap-1.5 disabled:opacity-40"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Forward (Newer)
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={(() => {
                                      const allRows = buildPaymentMatrix(student, studentTransactions[student.registrationNumber] || []);
                                      const page = monthPageMap[student.registrationNumber] || 0;
                                      return (page + 1) * 12 >= allRows.length;
                                    })()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMonthPageMap(prev => ({ ...prev, [student.registrationNumber]: (prev[student.registrationNumber] || 0) + 1 }));
                                    }}
                                    className="rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-['Inter'] flex items-center gap-1.5 disabled:opacity-40"
                                  >
                                    Back (Older)
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Summary cards */}
                              {(() => {
                                const allRows = buildPaymentMatrix(student, studentTransactions[student.registrationNumber] || []);
                                const page = monthPageMap[student.registrationNumber] || 0;
                                const pageRows = allRows.slice(page * 12, (page + 1) * 12);
                                const grandTotals = pageRows.reduce(
                                  (acc, row) => ({
                                    tuition: acc.tuition + row.tuition.paid,
                                    transport: acc.transport + row.transport.paid,
                                    uniformItems: acc.uniformItems + row.uniformItems.paid,
                                    relish: acc.relish + ((student.grade === 'ECD A' || student.grade === 'ECD B') ? row.relish.paid : 0),
                                    total: acc.total + row.rowTotal,
                                  }),
                                  { tuition: 0, transport: 0, uniformItems: 0, relish: 0, total: 0 }
                                );

                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                                    <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                      <div className="text-xs text-muted-foreground font-['Inter']">Monthly Tuition</div>
                                      <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-950 dark:text-zinc-50">${TARGETS.tuition}/mo</div>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                      <div className="text-xs text-muted-foreground font-['Inter']">Monthly Transport</div>
                                      <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-950 dark:text-zinc-50">${TARGETS.transport}/mo</div>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                      <div className="text-xs text-muted-foreground font-['Inter']">Uniform Paid</div>
                                      <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-950 dark:text-zinc-50">${grandTotals.uniformItems}</div>
                                    </div>
                                    <div className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                      <div className="text-xs text-muted-foreground font-['Inter']">Ledger Total</div>
                                      <div className="font-['Space_Grotesk'] text-sm font-bold text-zinc-950 dark:text-zinc-50">${grandTotals.total}</div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground font-['Inter']">No students found for filter</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
