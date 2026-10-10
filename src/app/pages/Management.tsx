import { GlassCard } from '../components/GlassCard';
import { Settings, Database, Bell, Shield, Download, Upload, Table, ChevronRight, Loader2, RefreshCw, Receipt } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';

export function Management() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [receiptBooks, setReceiptBooks] = useState<Record<string, any>>({});

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [statsData, studentsList, transactionsList, expensesList, receiptBookData] = await Promise.all([
        api.get<any>('/dashboard/stats').catch(() => null),
        api.get<any[]>('/students').catch(() => []),
        api.get<any[]>('/students/transactions').catch(() => []),
        api.get<any[]>('/expenses').catch(() => []),
        api.get<Record<string, any>>('/receipts/current').catch(() => ({})),
      ]);

      setStats(statsData);
      setStudents(studentsList || []);
      setTransactions(transactionsList || []);
      setExpenses(expensesList || []);
      setReceiptBooks(receiptBookData || {});
    } catch (error: any) {
      toast.error('Failed to load system management data', {
        description: error.message || 'Make sure the backend is running.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);
    const toastId = toast.loading('Initiating manual sync to cloud database...', {
      description: 'Pushing offline changes to Supabase...'
    });
    try {
      const result = await api.post<any>('/sync/manual');
      if (result && result.success) {
        toast.success('Sync complete!', {
          id: toastId,
          description: result.message || 'All records are now up to date.'
        });
      } else {
        toast.error('Sync failed', {
          id: toastId,
          description: result?.error || 'Unknown error occurred.'
        });
      }
    } catch (error: any) {
      toast.error('Sync failed', {
        id: toastId,
        description: error.message || 'Could not connect to sync service.'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Map backend stats view to fields used in management overview
  const statsMapped = stats ? {
    activeStudents: stats.active_students || 0,
    pendingDeletions: stats.pending_deletions || 0,
  } : {
    activeStudents: students.filter(s => s.status === 'active').length,
    pendingDeletions: students.filter(s => s.status === 'transferred').length,
  };

  const mappedStudents = students.slice(0, 10).map((s: any) => ({
    id: s.id,
    registrationNumber: s.registration_number,
    name: `${s.first_name} ${s.surname}`,
    grade: s.grade,
    registrationFeePaid: s.registration_fee_paid === 1,
    status: s.status
  }));

  const mappedTransactions = transactions.slice(0, 10).map((t: any) => ({
    id: t.id,
    receiptNumber: t.receipt_number,
    receiptBookType: t.receipt_book_type,
    studentName: t.studentName || t.student_name || t.registration_number,
    studentGrade: t.studentGrade || t.student_grade || t.grade || '—',
    type: t.type,
    amount: t.amount,
    date: t.date,
    paymentMethod: t.payment_method
  }));

  const mappedExpenses = expenses.slice(0, 10).map((e: any) => ({
    id: e.id,
    category: e.expense_type,
    description: e.description || '—',
    amount: e.amount,
    date: e.date
  }));

  const currentYear = new Date().getFullYear();
  const primarySchoolGrades = ['ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];
  const secondarySchoolGrades = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'];
  const allGradeOptions = [...primarySchoolGrades, ...secondarySchoolGrades];

  const [gradeFilter, setGradeFilter] = useState({
    level: 'all',
    from: 'ECD A',
    to: 'Form 6'
  });

  const [feeForm, setFeeForm] = useState({
    academicYear: String(currentYear),
    term: '1',
    grade: 'Grade 1',
    primaryTuition: '',
    secondaryTuition: '',
    transport: '',
    relish: ''
  });
  const [feeRows, setFeeRows] = useState<any[]>([]);

  const getVisibleGrades = () => {
    if (gradeFilter.level === 'primary') return primarySchoolGrades;
    if (gradeFilter.level === 'secondary') return secondarySchoolGrades;
    return allGradeOptions;
  };

  const getFilteredGradeRange = (options: string[]) => {
    const fromIndex = Math.max(0, options.indexOf(gradeFilter.from));
    const toIndex = Math.max(fromIndex, options.indexOf(gradeFilter.to));
    return options.slice(fromIndex, toIndex + 1);
  };

  useEffect(() => {
    const visibleGrades = getVisibleGrades();
    const rangeGrades = getFilteredGradeRange(visibleGrades);

    if (!rangeGrades.includes(feeForm.grade)) {
      setFeeForm((prev) => ({
        ...prev,
        grade: rangeGrades[0] || prev.grade,
      }));
    }
  }, [gradeFilter.level, gradeFilter.from, gradeFilter.to]);

  const loadFeeRows = async (year = feeForm.academicYear) => {
    try {
      const rows = await api.get<any[]>('/term-fees', { academic_year: year });
      setFeeRows(rows || []);

      const selected = (rows || []).find((row: any) => (
        row.grade === feeForm.grade && Number(row.term) === Number(feeForm.term)
      ));

      if (selected) {
        setFeeForm((prev) => ({
          ...prev,
          primaryTuition: selected.grade?.startsWith('Grade') || selected.grade?.startsWith('ECD') ? String(selected.tuition_fee ?? '') : prev.primaryTuition,
          secondaryTuition: selected.grade?.startsWith('Form') ? String(selected.tuition_fee ?? '') : prev.secondaryTuition,
          transport: String(selected.transport_fee ?? ''),
          relish: String(selected.relish_fee ?? ''),
        }));
      }
    } catch (error) {
      console.error('Failed to load fee structure records:', error);
    }
  };

  useEffect(() => {
    loadFeeRows();
  }, []);

  useEffect(() => {
    loadFeeRows(feeForm.academicYear);
  }, [feeForm.academicYear]);

  useEffect(() => {
    const selected = feeRows.find((row: any) => (
      row.grade === feeForm.grade && Number(row.term) === Number(feeForm.term)
    ));

    if (selected) {
      setFeeForm((prev) => ({
        ...prev,
        primaryTuition: (selected.grade?.startsWith('Grade') || selected.grade?.startsWith('ECD')) ? String(selected.tuition_fee ?? '') : prev.primaryTuition,
        secondaryTuition: selected.grade?.startsWith('Form') ? String(selected.tuition_fee ?? '') : prev.secondaryTuition,
        transport: String(selected.transport_fee ?? ''),
        relish: String(selected.relish_fee ?? ''),
      }));
    }
  }, [feeRows, feeForm.grade, feeForm.term]);

  const handleFeeFormChange = (field: string, value: string) => {
    setFeeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFeeSave = async () => {
    const payload = {
      academic_year: feeForm.academicYear,
      term: Number(feeForm.term),
      grade: feeForm.grade,
      tuition_fee: Number(feeForm.primaryTuition || feeForm.secondaryTuition || 0),
      transport_fee: Number(feeForm.transport || 0),
      relish_fee: Number(feeForm.relish || 0),
    };

    try {
      await api.post('/term-fees', payload);
      toast.success('Fee settings saved successfully');
      loadFeeRows(feeForm.academicYear);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save fees');
    }
  };

  const receiptBookDefinitions = [
    {
      key: 'primary_tuition',
      label: 'Primary Tuition',
      content: 'Tuition payments for ECD, Grade 1-6 and shared ECD relish receipts.'
    },
    {
      key: 'secondary_tuition',
      label: 'Secondary Tuition',
      content: 'Tuition payments for Forms 1-6.'
    },
    {
      key: 'transport',
      label: 'Transport',
      content: 'Transport fee receipts.'
    },
    {
      key: 'relish',
      label: 'Relish',
      content: 'ECD-only relish fee receipts, tied to the primary tuition book.'
    },
    {
      key: 'uniform',
      label: 'Uniform',
      content: 'Uniform and clothing sales receipts.'
    },
    {
      key: 'other',
      label: 'Other',
      content: 'Other miscellaneous school payments.'
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" />
        <p className="text-sm text-muted-foreground font-['Inter']">Loading system configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-['Space_Grotesk'] text-3xl mb-2">System Management</h1>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={syncing}
          className="rounded-[20px] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-['Inter'] flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync to Cloud'}
        </Button>
      </div>

      {/* System Overview */}
      <GlassCard>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-[20px] bg-[#3B82F6]/10">
            <Database className="w-6 h-6 text-[#3B82F6]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg mb-3">System Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Total Records</p>
                <p className="text-2xl font-['Space_Grotesk'] mt-1">{statsMapped.activeStudents + statsMapped.pendingDeletions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Total Transactions</p>
                <p className="text-2xl font-['Space_Grotesk'] mt-1">{transactions.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Database Status</p>
                <p className="text-2xl font-['Space_Grotesk'] mt-1 text-[#10B981]">Healthy</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Local Database</p>
                <p className="text-sm font-['Inter'] mt-1">SQLite 3 (local.db)</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Receipt Book Module */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#10B981]/10">
            <Receipt className="w-6 h-6 text-[#10B981]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Receipt Book</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Active receipt books and the current numbering state in the database.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {receiptBookDefinitions.map((book) => {
            const bookState = receiptBooks[book.key] || { current: 0, next: 1, formatted: '0001' };
            const bookTransactions = (transactions || []).filter((tx: any) => tx.receipt_book_type === book.key);

            return (
              <div key={book.key} className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
                <div className="bg-gray-50 dark:bg-slate-900/60 px-4 py-3 border-b border-gray-200 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-['Space_Grotesk'] text-base">{book.label}</h4>
                    <div className="text-xs text-muted-foreground">
                      <span>Current: </span>
                      <span className="font-semibold text-foreground">{bookState.current ?? 0}</span>
                      <span className="mx-2">|</span>
                      <span>Next: </span>
                      <span className="font-semibold text-foreground">{bookState.formatted ?? '0001'}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white dark:bg-slate-950/40">
                      <tr className="border-b border-gray-200 dark:border-white/10">
                        <th className="px-3 py-2 font-semibold">Receipt</th>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Grade</th>
                        <th className="px-3 py-2 font-semibold">Month</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-4 text-sm text-muted-foreground">No transactions in this book.</td>
                        </tr>
                      ) : (
                        bookTransactions.map((tx: any) => {
                          const studentName = tx.student_name || tx.studentName || tx.first_name || tx.registration_number || 'Unknown student';
                          const studentGrade = tx.studentGrade || tx.student_grade || tx.grade || '—';
                          const monthLabel = tx.date ? new Date(tx.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

                          return (
                            <tr key={`${tx.id ?? tx.receipt_number}-${tx.type}`} className="border-b border-gray-200 dark:border-white/10 last:border-b-0">
                              <td className="px-3 py-2 font-medium">#{tx.receipt_number || 'N/A'}</td>
                              <td className="px-3 py-2">{studentName}</td>
                              <td className="px-3 py-2">{studentGrade}</td>
                              <td className="px-3 py-2">{monthLabel}</td>
                              <td className="px-3 py-2 capitalize">{tx.type || 'payment'}</td>
                              <td className="px-3 py-2">{tx.date || '—'}</td>
                              <td className="px-3 py-2 text-right">{Number(tx.amount || 0).toFixed(2)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Fee Setup */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#F59E0B]/10">
            <Settings className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Fee Setup</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Set annual school fee values for the selected academic year, term, and grade.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Academic Year</label>
            <input
              value={feeForm.academicYear}
              onChange={(e) => handleFeeFormChange('academicYear', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Term</label>
            <select
              value={feeForm.term}
              onChange={(e) => handleFeeFormChange('term', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">School</label>
            <select
              value={gradeFilter.level}
              onChange={(e) => setGradeFilter((prev) => ({ ...prev, level: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="all">All Levels</option>
              <option value="primary">Primary School</option>
              <option value="secondary">Secondary School</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">From</label>
            <select
              value={gradeFilter.from}
              onChange={(e) => setGradeFilter((prev) => ({ ...prev, from: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {getVisibleGrades().map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">To</label>
            <select
              value={gradeFilter.to}
              onChange={(e) => setGradeFilter((prev) => ({ ...prev, to: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {getVisibleGrades().map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <label className="text-xs font-medium text-muted-foreground block mb-2">Selected Grades</label>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {getFilteredGradeRange(getVisibleGrades()).join(', ')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="font-['Space_Grotesk'] text-base mb-3">Primary School Tuition</h4>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Tuition Fee</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeForm.primaryTuition}
              onChange={(e) => handleFeeFormChange('primaryTuition', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="font-['Space_Grotesk'] text-base mb-3">Secondary Tuition</h4>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Tuition Fee</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeForm.secondaryTuition}
              onChange={(e) => handleFeeFormChange('secondaryTuition', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="font-['Space_Grotesk'] text-base mb-3">Transport Fee</h4>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Transport Fee</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeForm.transport}
              onChange={(e) => handleFeeFormChange('transport', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
            <h4 className="font-['Space_Grotesk'] text-base mb-3">Relish Fee</h4>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Relish Fee</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeForm.relish}
              onChange={(e) => handleFeeFormChange('relish', e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleFeeSave} className="rounded-[16px] bg-[#10B981] hover:bg-[#059669] text-white">
            Save fee setup
          </Button>
        </div>
      </GlassCard>

      {/* Database Simulation */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#8B5CF6]/10">
            <Table className="w-6 h-6 text-[#8B5CF6]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Database Preview</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Live view of the first 10 rows in each SQLite table
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Students Table */}
          <div className="border border-gray-200 dark:border-white/10 rounded-[20px] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-['Space_Grotesk'] font-semibold text-blue-700 dark:text-blue-300">students</span>
                <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-['Inter']">{students.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-['Inter']">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-900/20">
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">ID</th>
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">Reg#</th>
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">Name</th>
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">Grade</th>
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">Fee Paid</th>
                    <th className="p-2 text-left text-blue-700 dark:text-blue-300 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">No student records found</td>
                    </tr>
                  ) : (
                    mappedStudents.map((student) => (
                      <tr key={student.registrationNumber} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-2 text-gray-700 dark:text-gray-300">{student.id}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{student.registrationNumber}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{student.name}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{student.grade}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{student.registrationFeePaid ? 'Yes' : 'No'}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300 capitalize">{student.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border border-gray-200 dark:border-white/10 rounded-[20px] overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-['Space_Grotesk'] font-semibold text-green-700 dark:text-green-300">transactions</span>
                <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-['Inter']">{transactions.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-['Inter']">
                <thead>
                  <tr className="bg-green-50 dark:bg-green-900/20">
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Receipt#</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Book Type</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Student</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Type</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Amount</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Date</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground">No transaction records found</td>
                    </tr>
                  ) : (
                    mappedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.receiptNumber}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300 capitalize">
                          <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                            transaction.receiptBookType === 'secondary_tuition' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : transaction.receiptBookType === 'primary_tuition'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}>
                            {transaction.receiptBookType?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.studentName}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300 capitalize">{transaction.type}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">${transaction.amount.toFixed(2)}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300 capitalize">{transaction.paymentMethod}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="border border-gray-200 dark:border-white/10 rounded-[20px] overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="font-['Space_Grotesk'] font-semibold text-orange-700 dark:text-orange-300">expenses</span>
                <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full font-['Inter']">{expenses.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-['Inter']">
                <thead>
                  <tr className="bg-orange-50 dark:bg-orange-900/20">
                    <th className="p-2 text-left text-orange-700 dark:text-orange-300 font-semibold">ID</th>
                    <th className="p-2 text-left text-orange-700 dark:text-orange-300 font-semibold">Category</th>
                    <th className="p-2 text-left text-orange-700 dark:text-orange-300 font-semibold">Description</th>
                    <th className="p-2 text-left text-orange-700 dark:text-orange-300 font-semibold">Amount</th>
                    <th className="p-2 text-left text-orange-700 dark:text-orange-300 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">No expense records found</td>
                    </tr>
                  ) : (
                    mappedExpenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-2 text-gray-700 dark:text-gray-300">{expense.id}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{expense.category}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{expense.description}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">${expense.amount.toFixed(2)}</td>
                        <td className="p-2 text-gray-700 dark:text-gray-300">{new Date(expense.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-gray-200 dark:border-white/10 rounded-[20px] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-['Space_Grotesk'] font-semibold text-purple-700 dark:text-purple-300">users</span>
                <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full font-['Inter']">3 records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-['Inter']">
                <thead>
                  <tr className="bg-purple-50 dark:bg-purple-900/20">
                    <th className="p-2 text-left text-purple-700 dark:text-purple-300 font-semibold">ID</th>
                    <th className="p-2 text-left text-purple-700 dark:text-purple-300 font-semibold">Username</th>
                    <th className="p-2 text-left text-purple-700 dark:text-purple-300 font-semibold">Email</th>
                    <th className="p-2 text-left text-purple-700 dark:text-purple-300 font-semibold">Role</th>
                    <th className="p-2 text-left text-purple-700 dark:text-purple-300 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-2 text-gray-700 dark:text-gray-300">u1</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">admin</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">admin@tinevimbo.zw</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">admin</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">2025-01-01</td>
                  </tr>
                  <tr className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-2 text-gray-700 dark:text-gray-300">u2</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">teacher1</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">teacher1@tinevimbo.zw</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">teacher</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">2025-01-15</td>
                  </tr>
                  <tr className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-2 text-gray-700 dark:text-gray-300">u3</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">bursar</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">bursar@tinevimbo.zw</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">bursar</td>
                    <td className="p-2 text-gray-700 dark:text-gray-300">2025-02-01</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Notification Settings */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#10B981]/10">
            <Bell className="w-6 h-6 text-[#10B981]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Configure system alerts and notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 bg-gray-50 border border-gray-200">
            <div>
              <Label className="font-['Inter']">Payment Notifications</Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Alert when new payments are recorded
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 bg-gray-50 border border-gray-200">
            <div>
              <Label className="font-['Inter']">Budget Alerts</Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Warn when categories exceed 80% of budget
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 bg-gray-50 border border-gray-200">
            <div>
              <Label className="font-['Inter']">New Student Welcome</Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Send automated welcome messages
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between p-4 rounded-[20px] dark:bg-white/5 bg-gray-50 border border-gray-200">
            <div>
              <Label className="font-['Inter']">Transfer Reminders</Label>
              <p className="text-xs text-muted-foreground font-['Inter']">
                Notify before 180-day deletion deadline
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#F59E0B]/10">
            <Shield className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Data Management</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Backup, export, and manage your data
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => toast.success('Backup initiated', { description: 'Your data is being backed up...' })}
            className="w-full rounded-[20px] dark:bg-white/10 dark:hover:bg-white/20 dark:text-foreground bg-gray-100 hover:bg-gray-200 text-gray-700 justify-start font-['Inter']"
            variant="ghost"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Full Backup
          </Button>

          <Button
            onClick={() => toast.info('Export started', { description: 'Generating CSV file...' })}
            className="w-full rounded-[20px] dark:bg-white/10 dark:hover:bg-white/20 dark:text-foreground bg-gray-100 hover:bg-gray-200 text-gray-700 justify-start font-['Inter']"
            variant="ghost"
          >
            <Upload className="w-4 h-4 mr-2" />
            Export Student Records (CSV)
          </Button>

          <Button
            onClick={() => toast.info('Export started', { description: 'Generating financial report...' })}
            className="w-full rounded-[20px] dark:bg-white/10 dark:hover:bg-white/20 dark:text-foreground bg-gray-100 hover:bg-gray-200 text-gray-700 justify-start font-['Inter']"
            variant="ghost"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Financial Report (PDF)
          </Button>
        </div>
      </GlassCard>

      {/* System Information */}
      <GlassCard>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-[20px] bg-[#3B82F6]/10">
            <Settings className="w-6 h-6 text-[#3B82F6]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg mb-3">System Information</h3>
            <div className="space-y-2 text-sm font-['Inter']">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">School Name</span>
                <span>Tinevimbo School</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License</span>
                <span className="text-[#10B981]">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Support</span>
                <span>support@tinevimbo.zw</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
