import { GlassCard } from '../components/GlassCard';
import { Users, DollarSign, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import { calculateStats, calculateGradeDistribution, calculateGradeDistributionWithNewStudents, calculateDailyFeeBreakdown, calculateDailySummary, calculateStudentStatistics, mockStudents } from '../data/mockData';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export function Dashboard() {
  const stats = calculateStats();
  const gradeDistribution = calculateGradeDistribution();
  const gradeDistributionWithNew = calculateGradeDistributionWithNewStudents();
  const studentStatistics = calculateStudentStatistics();
  const [dateOffset, setDateOffset] = useState(0);
  const [tableDateOffset, setTableDateOffset] = useState(0);
  const [showTransferredOnly, setShowTransferredOnly] = useState(false);
  const feeBreakdown = calculateDailyFeeBreakdown(dateOffset);
  const dailySummary = calculateDailySummary(tableDateOffset);

  const transferredStudents = mockStudents.filter((s) => s.status === 'transferred');

  // Friday Bot - Projected Profit Calculation
  const projectedProfit = stats.profit * 1.15; // Simple projection
  const confidenceScore = Math.min(95, Math.round((stats.totalRevenue / (stats.totalRevenue + stats.totalExpenses)) * 100));

  // Theme-aware chart colors using CSS variables
  const gridColor = 'var(--color-border)';
  const axisColor = 'var(--color-muted-foreground)';
  const tooltipBg = 'var(--color-popover)';
  const tooltipBorder = 'var(--color-border)';
  const labelTextColor = 'var(--color-foreground)';

  // Prepare data for ECD and Primary Grades bar chart with stacked old/new students
  const ecdPrimaryData = [
    { grade: 'ECD A', old: gradeDistributionWithNew['ECD A'].old, new: gradeDistributionWithNew['ECD A'].new },
    { grade: 'ECD B', old: gradeDistributionWithNew['ECD B'].old, new: gradeDistributionWithNew['ECD B'].new },
    { grade: 'Grade 1', old: gradeDistributionWithNew['Grade 1'].old, new: gradeDistributionWithNew['Grade 1'].new },
    { grade: 'Grade 2', old: gradeDistributionWithNew['Grade 2'].old, new: gradeDistributionWithNew['Grade 2'].new },
    { grade: 'Grade 3', old: gradeDistributionWithNew['Grade 3'].old, new: gradeDistributionWithNew['Grade 3'].new },
    { grade: 'Grade 4', old: gradeDistributionWithNew['Grade 4'].old, new: gradeDistributionWithNew['Grade 4'].new },
    { grade: 'Grade 5', old: gradeDistributionWithNew['Grade 5'].old, new: gradeDistributionWithNew['Grade 5'].new },
    { grade: 'Grade 6', old: gradeDistributionWithNew['Grade 6'].old, new: gradeDistributionWithNew['Grade 6'].new },
    { grade: 'Grade 7', old: gradeDistributionWithNew['Grade 7'].old, new: gradeDistributionWithNew['Grade 7'].new },
  ];

  // Prepare data for Forms bar chart with stacked old/new students
  const formsData = [
    { grade: 'Form 1', old: gradeDistributionWithNew['Form 1'].old, new: gradeDistributionWithNew['Form 1'].new },
    { grade: 'Form 2', old: gradeDistributionWithNew['Form 2'].old, new: gradeDistributionWithNew['Form 2'].new },
    { grade: 'Form 3', old: gradeDistributionWithNew['Form 3'].old, new: gradeDistributionWithNew['Form 3'].new },
    { grade: 'Form 4', old: gradeDistributionWithNew['Form 4'].old, new: gradeDistributionWithNew['Form 4'].new },
    { grade: 'Form 5', old: gradeDistributionWithNew['Form 5'].old, new: gradeDistributionWithNew['Form 5'].new },
    { grade: 'Form 6', old: gradeDistributionWithNew['Form 6'].old, new: gradeDistributionWithNew['Form 6'].new },
  ];

  // Prepare data for fee breakdown chart - separate arrays for each category
  const feeBreakdownData = [
    { category: 'Primary Fees', amount: feeBreakdown.primaryFees, fill: '#3B82F6' },
    { category: 'Secondary Fees', amount: feeBreakdown.secondaryFees, fill: '#10B981' },
    { category: 'Transport', amount: feeBreakdown.transportFees, fill: '#F59E0B' },
    { category: 'Uniforms', amount: feeBreakdown.uniformFees, fill: '#8B5CF6' },
    { category: 'Expenses', amount: feeBreakdown.totalExpenses, fill: '#EF4444' },
  ];

  // Calculate profit/loss difference
  const profitLoss = feeBreakdown.totalIncome - feeBreakdown.totalExpenses;
  const profitLossColor = profitLoss >= 0 ? '#10B981' : '#EF4444';

  // Navigation functions
  const goToPreviousDay = () => setDateOffset(prev => Math.min(prev + 1, 30)); // Limit to 30 days back
  const goToNextDay = () => setDateOffset(prev => Math.max(prev - 1, 0)); // Can't go beyond today
  
  // Table navigation functions
  const goToPreviousTableDay = () => setTableDateOffset(prev => Math.min(prev + 1, 30)); // Limit to 30 days back
  const goToNextTableDay = () => setTableDateOffset(prev => Math.max(prev - 1, 0)); // Can't go beyond today
  
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

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
                {stats.activeStudents}
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
                ${stats.totalRevenue}
              </h3>
              <p className="text-xs text-[#10B981] mt-2 font-['Inter']">
                +12% from last month
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
                {stats.pendingDeletions}
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
              {formatDateDisplay(dailySummary.date)}
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
                  <TableRow key={s.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                    <TableCell className="font-['Inter']">{s.name}</TableCell>
                    <TableCell className="font-['Inter']">{s.grade}</TableCell>
                    <TableCell className="font-['Inter']">{s.transferDate ? new Date(s.transferDate).toLocaleDateString() : '-'}</TableCell>
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
                  <TableCell className="font-['Inter'] font-medium">Primary School Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">${dailySummary.primaryFees.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-['Inter']">
                      ECD A, B, Grade 1-2
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium">Secondary School Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">${dailySummary.secondaryFees.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">
                      Grade 3-7, Forms 1-6
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium">Transport Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">${dailySummary.transportFees.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-['Inter']">
                      Daily Transport
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium">Uniform Fees</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">${dailySummary.uniformFees.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs font-['Inter']">
                      School Uniforms
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-medium">Total Expenses</TableCell>
                  <TableCell className="font-['Space_Grotesk'] text-[#EF4444] text-right">${dailySummary.totalExpenses.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#EF4444]/10 text-[#EF4444] text-xs font-['Inter']">
                      Operating Costs
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-bold text-lg">Total Income</TableCell>
                  <TableCell className="font-['Space_Grotesk'] font-bold text-lg text-[#10B981] text-right">${dailySummary.totalIncome.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="px-2 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-['Inter']">
                      All Revenue
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-bold text-lg">Profit (Cash In)</TableCell>
                  <TableCell className={`font-['Space_Grotesk'] font-bold text-lg text-right ${dailySummary.profit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    ${Math.abs(dailySummary.profit).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-['Inter'] ${
                      dailySummary.profit >= 0 
                        ? 'bg-[#10B981]/10 text-[#10B981]' 
                        : 'bg-[#EF4444]/10 text-[#EF4444]'
                    }`}>
                      {dailySummary.profit >= 0 ? 'Profit' : 'Loss'}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </GlassCard>

      {/* Daily Fee Breakdown Chart */}
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
              {formatDateDisplay(feeBreakdown.date)}
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
                domain={[0, 'dataMax + 100']} // Add padding to prevent cutoff
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
              Total Income: <span className="text-[#10B981] font-semibold">${feeBreakdown.totalIncome.toFixed(2)}</span>
            </p>
            <p className="text-sm text-muted-foreground font-['Inter']">
              Total Expenses: <span className="text-[#EF4444] font-semibold">${feeBreakdown.totalExpenses.toFixed(2)}</span>
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
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{studentStatistics.ECD.total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{studentStatistics.ECD.new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{studentStatistics.ECD.monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{studentStatistics.ECD.weekOld}</TableCell>
              </TableRow>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableCell className="font-['Inter'] font-medium">Primary School</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{studentStatistics['Primary School'].total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{studentStatistics['Primary School'].new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{studentStatistics['Primary School'].monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{studentStatistics['Primary School'].weekOld}</TableCell>
              </TableRow>
              <TableRow className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                <TableCell className="font-['Inter'] font-medium">Forms</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#3B82F6] text-right">{studentStatistics.Forms.total}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#10B981] text-right">{studentStatistics.Forms.new}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#F59E0B] text-right">{studentStatistics.Forms.monthOld}</TableCell>
                <TableCell className="font-['Space_Grotesk'] text-[#8B5CF6] text-right">{studentStatistics.Forms.weekOld}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Weekly Income vs Expenses Bar Chart */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Weekly Income vs Expenses</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                style={{ fontFamily: 'Inter', fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke={axisColor}
                style={{ fontFamily: 'Inter', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
                domain={[0, 'dataMax + 50']} // Add padding for labels
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: '20px',
                  fontFamily: 'Inter',
                  color: 'var(--color-popover-foreground)',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Bar dataKey="income" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Income" label={{ position: 'top', formatter: (value: number) => `$${value.toFixed(0)}`, style: { fill: labelTextColor, fontSize: 11, fontWeight: 'bold' } }} />
              <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" label={{ position: 'top', formatter: (value: number) => `$${value.toFixed(0)}`, style: { fill: labelTextColor, fontSize: 11, fontWeight: 'bold' } }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            <span className="text-sm font-['Inter']">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
            <span className="text-sm font-['Inter']">Expenses</span>
          </div>
        </div>
      </GlassCard>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ECD and Primary Grades */}
            <GlassCard>
              <h3 className="font-['Space_Grotesk'] text-lg mb-4">ECD & Primary Grades</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ecdPrimaryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="grade"
                      stroke={axisColor}
                      style={{ fontFamily: 'Inter', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke={axisColor}
                      style={{ fontFamily: 'Inter', fontSize: 12 }}
                      domain={[0, 'dataMax + 1']} // Add padding for labels
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '20px',
                        fontFamily: 'Inter',
                        color: 'var(--color-popover-foreground)',
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="rect"
                      formatter={(value) => <span style={{ color: 'var(--color-foreground)', fontFamily: 'Inter' }}>{value}</span>}
                    />
                    <Bar dataKey="old" stackId="a" fill="#6B7280" radius={[8, 8, 0, 0]} name="Old Students" />
                    <Bar dataKey="new" stackId="a" fill="#10B981" radius={[0, 0, 8, 8]} name="New Students" 
                      label={{ position: 'top', formatter: (value: any, entry?: any) => {
                        if (!entry || !entry.payload) return '';
                        const old = entry.payload.old || 0;
                        const newStudents = entry.payload.new || 0;
                        const total = old + newStudents;
                        if (total === 0) return '';
                        return [
                          `Total: ${total}`,
                          newStudents > 0 ? `New: ${newStudents}` : ''
                        ].filter(Boolean).join('\n');
                      }, style: { fill: labelTextColor, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' } }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground font-['Inter']">
                  Total ECD & Primary: {Object.values(gradeDistribution).slice(0, 9).reduce((a, b) => a + b, 0)} students
                </p>
              </div>
            </GlassCard>

            {/* Forms */}
            <GlassCard>
              <h3 className="font-['Space_Grotesk'] text-lg mb-4">Secondary Forms</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis
                      dataKey="grade"
                      stroke={axisColor}
                      style={{ fontFamily: 'Inter', fontSize: 12 }}
                    />
                    <YAxis
                      stroke={axisColor}
                      style={{ fontFamily: 'Inter', fontSize: 12 }}
                      domain={[0, 'dataMax + 1']} // Add padding for labels
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        borderRadius: '20px',
                        fontFamily: 'Inter',
                        color: 'var(--color-popover-foreground)',
                      }}
                    />
                    <Bar dataKey="old" stackId="a" fill="#6B7280" radius={[8, 8, 0, 0]} name="Old Students" />
                    <Bar dataKey="new" stackId="a" fill="#10B981" radius={[0, 0, 8, 8]} name="New Students" 
                      label={{ position: 'top', formatter: (value: any, entry?: any) => {
                        if (!entry || !entry.payload) return '';
                        const old = entry.payload.old || 0;
                        const newStudents = entry.payload.new || 0;
                        const total = old + newStudents;
                        if (total === 0) return '';
                        return [
                          `Total: ${total}`,
                          newStudents > 0 ? `New: ${newStudents}` : ''
                        ].filter(Boolean).join('\n');
                      }, style: { fill: labelTextColor, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' } }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground font-['Inter']">
                  Total Forms: {Object.values(gradeDistribution).slice(9).reduce((a, b) => a + b, 0)} students
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Friday Bot - AI Insights */}
          <GlassCard>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-[20px] bg-[#10B981]/10">
                <TrendingUp className="w-6 h-6 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <h3 className="font-['Space_Grotesk'] text-lg mb-2">Friday Bot Insights</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-['Inter']">Projected Monthly Profit</span>
                    <span className="text-lg font-['Space_Grotesk'] text-[#10B981]">
                      ${projectedProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-['Inter']">Confidence Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 dark:bg-white/10 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] transition-all duration-500"
                          style={{ width: `${confidenceScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-['Space_Grotesk'] text-[#10B981]">
                        {confidenceScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 font-['Inter']">
                    Based on tuition payment patterns and projected enrollment growth
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* 7-Day Income vs Expenses Chart */}
          <GlassCard>
            <h3 className="font-['Space_Grotesk'] text-lg mb-4">7-Day Financial Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    stroke={axisColor}
                    style={{ fontFamily: 'Inter', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke={axisColor}
                    style={{ fontFamily: 'Inter', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '20px',
                      fontFamily: 'Inter',
                      color: 'var(--color-popover-foreground)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', r: 4 }}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', r: 4 }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="text-sm font-['Inter']">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="text-sm font-['Inter']">Expenses</span>
              </div>
            </div>
          </GlassCard>
        </div>
      );
  }
