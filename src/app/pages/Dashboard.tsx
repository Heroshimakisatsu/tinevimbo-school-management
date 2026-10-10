import { GlassCard } from '../components/GlassCard';
import { Users, DollarSign, AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [gradeDistribution, setGradeDistribution] = useState<any>(null);
  const [studentStatistics, setStudentStatistics] = useState<any>(null);
  const [transferredStudents, setTransferredStudents] = useState<any[]>([]);
  const [dateOffset, setDateOffset] = useState(0);
  const [tableDateOffset, setTableDateOffset] = useState(0);
  const [showTransferredOnly, setShowTransferredOnly] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [weeklyFinancials, setWeeklyFinancials] = useState<any[]>([]);

  const getOffsetDateString = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [statsData, distData, studentStatsData, transferredData, weeklyData] = await Promise.all([
          api.get<any>('/dashboard/stats'),
          api.get<any>('/dashboard/grade-distribution'),
          api.get<any>('/dashboard/student-statistics'),
          api.get<any[]>('/students', { status: 'transferred' }),
          api.get<any[]>('/dashboard/weekly-financials')
        ]);
        setStats(statsData);
        setGradeDistribution(distData);
        setStudentStatistics(studentStatsData);
        setTransferredStudents(transferredData);
        setWeeklyFinancials(weeklyData);
      } catch (error: any) {
        toast.error('Failed to load dashboard data', {
          description: error.message || 'Make sure the backend is running.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch daily fee breakdown when dateOffset changes
  useEffect(() => {
    const fetchFeeBreakdown = async () => {
      try {
        const dateStr = getOffsetDateString(dateOffset);
        const data = await api.get<any>('/dashboard/daily-fee-breakdown', { date: dateStr });
        setFeeBreakdown(data);
        // Keep the table summary in sync when navigating the chart date
        setDailySummary(data);
      } catch (error) {
        console.error('Failed to fetch daily fee breakdown:', error);
      }
    };
    fetchFeeBreakdown();
  }, [dateOffset]);

  // Fetch daily summary when tableDateOffset changes
  useEffect(() => {
    const fetchDailySummary = async () => {
      try {
        const dateStr = getOffsetDateString(tableDateOffset);
        const data = await api.get<any>('/dashboard/daily-fee-breakdown', { date: dateStr });
        setDailySummary(data);
      } catch (error) {
        console.error('Failed to fetch daily summary:', error);
      }
    };
    fetchDailySummary();
  }, [tableDateOffset]);

  const getGradeOldNew = (gradeName: string) => {
    const item = gradeDistribution?.find((g: any) => g.grade === gradeName);
    return {
      old: item ? item.returning_students : 0,
      new: item ? item.new_students : 0
    };
  };

  const getCategoryStatsForTable = (categoryName: string) => {
    const item = studentStatistics?.find((s: any) => s.category === categoryName);
    if (!item) return { total: 0, new: 0, monthOld: 0, weekOld: 0 };
    return {
      total: item.total || 0,
      new: item.new_this_week || 0,
      monthOld: item.month_old || 0,
      weekOld: Math.max(0, (item.new_this_month || 0) - (item.new_this_week || 0))
    };
  };

  // Map backend stats view to camelCase fields used in dashboard
  const statsMapped = stats ? {
    activeStudents: stats.active_students || 0,
    totalRevenue: stats.total_revenue || 0,
    totalExpenses: stats.total_expenses || 0,
    pendingDeletions: stats.pending_deletions || 0,
    profit: (stats.total_revenue || 0) - (stats.total_expenses || 0),
    dailyData: weeklyFinancials || []
  } : {
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    pendingDeletions: 0,
    profit: 0,
    dailyData: []
  };

  // Theme-aware chart colors using CSS variables
  const gridColor = 'var(--color-border)';
  const axisColor = 'var(--color-muted-foreground)';
  const tooltipBg = 'var(--color-popover)';
  const tooltipBorder = 'var(--color-border)';
  const labelTextColor = 'var(--color-foreground)';

  // Prepare data for ECD and Primary Grades bar chart with stacked old/new students
  const ecdPrimaryData = [
    { grade: 'ECD A', ...getGradeOldNew('ECD A') },
    { grade: 'ECD B', ...getGradeOldNew('ECD B') },
    { grade: 'Grade 1', ...getGradeOldNew('Grade 1') },
    { grade: 'Grade 2', ...getGradeOldNew('Grade 2') },
    { grade: 'Grade 3', ...getGradeOldNew('Grade 3') },
    { grade: 'Grade 4', ...getGradeOldNew('Grade 4') },
    { grade: 'Grade 5', ...getGradeOldNew('Grade 5') },
    { grade: 'Grade 6', ...getGradeOldNew('Grade 6') },
    { grade: 'Grade 7', ...getGradeOldNew('Grade 7') },
  ];

  // Prepare data for Forms bar chart with stacked old/new students
  const formsData = [
    { grade: 'Form 1', ...getGradeOldNew('Form 1') },
    { grade: 'Form 2', ...getGradeOldNew('Form 2') },
    { grade: 'Form 3', ...getGradeOldNew('Form 3') },
    { grade: 'Form 4', ...getGradeOldNew('Form 4') },
    { grade: 'Form 5', ...getGradeOldNew('Form 5') },
    { grade: 'Form 6', ...getGradeOldNew('Form 6') },
  ];

  // Prepare data for fee breakdown chart - aggregate primary/secondary components
  const primaryTotal = (feeBreakdown?.primaryFees || 0) + (feeBreakdown?.primaryTransport || 0) + (feeBreakdown?.primaryUniform || 0);
  const secondaryTotal = (feeBreakdown?.secondaryFees || 0) + (feeBreakdown?.secondaryTransport || 0) + (feeBreakdown?.secondaryUniform || 0);
  const transportTotal = (feeBreakdown?.primaryTransport || 0) + (feeBreakdown?.secondaryTransport || 0);
  const uniformTotal = (feeBreakdown?.primaryUniform || 0) + (feeBreakdown?.secondaryUniform || 0);

  const feeBreakdownData = [
    { category: 'Primary (All)', amount: primaryTotal, fill: '#3B82F6' },
    { category: 'Secondary (All)', amount: secondaryTotal, fill: '#10B981' },
    { category: 'Transport', amount: transportTotal, fill: '#F59E0B' },
    { category: 'Uniforms', amount: uniformTotal, fill: '#8B5CF6' },
    { category: 'Expenses', amount: feeBreakdown?.totalExpenses || 0, fill: '#EF4444' },
  ];

  // Calculate profit/loss difference
  const profitLoss = feeBreakdown ? (feeBreakdown.totalIncome - feeBreakdown.totalExpenses) : 0;
  const profitLossColor = profitLoss >= 0 ? '#10B981' : '#EF4444';

  // Navigation functions
  const goToPreviousDay = () => setDateOffset(prev => Math.min(prev + 1, 30)); // Limit to 30 days back
  const goToNextDay = () => setDateOffset(prev => Math.max(prev - 1, 0)); // Can't go beyond today
  
  // Table navigation functions
  const goToPreviousTableDay = () => setTableDateOffset(prev => Math.min(prev + 1, 30)); // Limit to 30 days back
  const goToNextTableDay = () => setTableDateOffset(prev => Math.max(prev - 1, 0)); // Can't go beyond today
  
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Loading...';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalECDPrimary = (gradeDistribution || [])
    .filter((g: any) => g.grade.includes('ECD') || g.grade.includes('Grade'))
    .reduce((sum: number, g: any) => sum + (g.total || 0), 0);

  const totalSecondary = (gradeDistribution || [])
    .filter((g: any) => g.grade.includes('Form'))
    .reduce((sum: number, g: any) => sum + (g.total || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6]" />
        <p className="text-muted-foreground font-['Inter']">Loading dashboard center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Command Center</h1>
        <p className="text-muted-foreground font-['Inter']">
          Real-time overview of Tinevimbo's operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Total Students</p>
              <h3 className="text-3xl font-['Space_Grotesk'] text-[#3B82F6]">
                {statsMapped.activeStudents}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 font-['Inter']">Currently enrolled</p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#3B82F6]/10">
              <Users className="w-6 h-6 text-[#3B82F6]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Monthly Revenue</p>
              <h3 className="text-3xl font-['Space_Grotesk'] text-[#10B981]">
                ${statsMapped.totalRevenue}
              </h3>
              <p className="text-xs text-[#10B981] mt-2 font-['Inter']">
                Current month total
              </p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#10B981]/10">
              <DollarSign className="w-6 h-6 text-[#10B981]" />
            </div>
          </div>
        </GlassCard>

        <GlassCard
          hover
          onClick={() => setShowTransferredOnly((v) => !v)}
          className={showTransferredOnly ? 'cursor-pointer ring-2 ring-[#EF4444]/20' : 'cursor-pointer'}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Pending Deletions</p>
              <h3 className="text-3xl font-['Space_Grotesk'] text-[#EF4444]">
                {statsMapped.pendingDeletions}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 font-['Inter']">
                Transferred students
              </p>
            </div>
            <div className="p-3 rounded-[20px] bg-[#EF4444]/10">
              <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Daily Summary Table or Transferred Students */}
      <GlassCard className={showTransferredOnly ? 'border border-[#EF4444] ' : undefined}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Space_Grotesk'] text-lg">{showTransferredOnly ? 'Transferred Students' : 'Daily Financial Summary'}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousTableDay}
              disabled={tableDateOffset >= 30}
              className="p-2 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-['Inter'] min-w-[140px] text-center">
              {dailySummary ? formatDateDisplay(dailySummary.date) : 'Loading...'}
            </span>
            <button
              onClick={goToNextTableDay}
              disabled={tableDateOffset <= 0}
              className="p-2 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className={showTransferredOnly ? 'overflow-x-auto border border-[#EF4444] rounded-lg p-2' : 'overflow-x-auto'}>
          {showTransferredOnly ? (
            <Table className="border border-[#EF4444] rounded-lg">
              <TableHeader>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-['Inter']">Name</TableHead>
                  <TableHead className="font-['Inter']">Grade</TableHead>
                  <TableHead className="font-['Inter']">Transfer Date</TableHead>
                  <TableHead className="font-['Inter']">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transferredStudents.map((s) => (
                  <TableRow key={s.id || s.registration_number} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                    <TableCell className="font-['Inter']">{s.first_name} {s.surname}</TableCell>
                    <TableCell className="font-['Inter']">{s.grade}</TableCell>
                    <TableCell className="font-['Inter']">{s.transfer_date ? new Date(s.transfer_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="font-['Inter']">Transferred</TableCell>
                  </TableRow>
                ))}
                {transferredStudents.length === 0 && (
                  <TableRow>
                    <TableCell className="font-['Inter']" colSpan={4}>No transferred students</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableHead className="font-['Inter']">Category</TableHead>
                  <TableHead className="font-['Inter'] text-right">Amount</TableHead>
                  <TableHead className="font-['Inter'] text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#3B82F6]">Primary School Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">${(dailySummary?.primaryFees || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-['Inter']">ECD A, B, Grade 1-2</span>
                  </TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#3B82F6]">Primary Transport</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">${(dailySummary?.primaryTransport || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-['Inter']">ECD A, B, Grade 1-2</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#3B82F6]">Primary Uniform</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">${(dailySummary?.primaryUniform || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-['Inter']">ECD A, B, Grade 1-2</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#10B981]">Secondary School Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">${(dailySummary?.secondaryFees || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">Grade 3-7, Forms 1-6</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#10B981]">Secondary Transport</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">${(dailySummary?.secondaryTransport || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">Grade 3-7, Forms 1-6</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium text-[#10B981]">Secondary Uniform</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">${(dailySummary?.secondaryUniform || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">Grade 3-7, Forms 1-6</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-bold text-lg text-[#10B981]">Total Income</TableCell>
                  <TableCell className="font-['Space_Grotesk'] font-bold text-lg text-[#10B981] text-right">${(dailySummary?.totalIncome || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">All Revenue</span>
                  </TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-bold text-lg text-[#EF4444]">Total Expenses</TableCell>
                  <TableCell className="font-['Space_Grotesk'] font-bold text-lg text-[#EF4444] text-right">{"-$" + (Math.abs(dailySummary?.totalExpenses || 0)).toFixed(2)}</TableCell>
                  <TableCell className="text-right"><span className="px-2 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-['Inter']">Operating Costs</span></TableCell>
                </TableRow>

                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-bold text-lg text-[#10B981]">Profit (Cash In)</TableCell>
                  <TableCell className={`font-['Space_Grotesk'] font-bold text-lg text-right ${(dailySummary?.profit || 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    ${Math.abs(dailySummary?.profit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${(dailySummary?.profit || 0) >= 0 
                        ? 'bg-[#10B981]/10 text-[#10B981]' 
                        : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }`}>{(dailySummary?.profit || 0) >= 0 ? 'Profit' : 'Loss'}</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>

      {/*
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Space_Grotesk'] text-lg">Daily Fee Breakdown</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              disabled={dateOffset >= 30}
              className="p-2 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-['Inter'] min-w-[140px] text-center">
              {feeBreakdown ? formatDateDisplay(feeBreakdown.date) : 'Loading...'}
            </span>
            <button
              onClick={goToNextDay}
              disabled={dateOffset <= 0}
              className="p-2 rounded-[20px] dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-96 pt-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={feeBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="category"
                stroke={axisColor}
                style={{ fontFamily: 'Inter', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                stroke={axisColor}
                style={{ fontFamily: 'Inter', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                domain={[0, 'dataMax + 100']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '20px',
                  fontFamily: 'Inter',
                  color: 'var(--color-popover-foreground)',
                }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} label={{ position: 'top', formatter: (value: number) => `$${value.toFixed(0)}`, style: { fill: labelTextColor, fontSize: 12, fontWeight: 'bold' } }}>
                {feeBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <p className="text-sm text-muted-foreground font-['Inter']">
              Total Income: <span className="text-[#10B981] font-semibold">${(feeBreakdown?.totalIncome || 0).toFixed(2)}</span>
            </p>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Total Expenses: <span className="text-[#EF4444] font-semibold">${(feeBreakdown?.totalExpenses || 0).toFixed(2)}</span>
            </p>
          </div>
          <div className="flex items-center justify-center">
            <p className="text-lg font-['Space_Grotesk']">
              {profitLoss >= 0 ? 'Profit' : 'Loss'}: 
              <span className={`font-bold ml-2`} style={{ color: profitLossColor }}>
                ${Math.abs(profitLoss).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Student Statistics Table */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Space_Grotesk'] text-lg">Number of Students</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableHead className="font-['Inter']">Category</TableHead>
                <TableHead className="font-['Inter'] text-right">Total Students</TableHead>
                <TableHead className="font-['Inter'] text-right">New Students</TableHead>
                <TableHead className="font-['Inter'] text-right">Month Old</TableHead>
                <TableHead className="font-['Inter'] text-right">Week Old</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableCell className="font-['Inter'] font-medium">ECD</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{getCategoryStatsForTable('ecd').total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{getCategoryStatsForTable('ecd').new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{getCategoryStatsForTable('ecd').monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{getCategoryStatsForTable('ecd').weekOld}</TableCell>
              </TableRow>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableCell className="font-['Inter'] font-medium">Primary School</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{getCategoryStatsForTable('primary').total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{getCategoryStatsForTable('primary').new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{getCategoryStatsForTable('primary').monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{getCategoryStatsForTable('primary').weekOld}</TableCell>
              </TableRow>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableCell className="font-['Inter'] font-medium">Forms</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{getCategoryStatsForTable('secondary').total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{getCategoryStatsForTable('secondary').new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{getCategoryStatsForTable('secondary').monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{getCategoryStatsForTable('secondary').weekOld}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </GlassCard>




    </div>
  );
}
