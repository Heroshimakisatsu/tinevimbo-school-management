import { useState, Fragment } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { mockStudents, mockTransactions } from '../data/mockData';
import { toast } from 'sonner';
import { Leaf, ArrowRight, RotateCcw, AlertCircle, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { motion } from 'motion/react';
import { cn } from '../components/ui/utils';

export function Tracer() {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState(mockStudents);
  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary');
  const [showTransferredOnly, setShowTransferredOnly] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const toggleStudentProfile = (studentId: string) => {
    setExpandedStudentId(prev => prev === studentId ? null : studentId);
  };

  const getFinancialProfile = (studentId: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.map((month, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const monthKey = `2026-${monthNum}`;
      const studentTx = mockTransactions.filter(t => t.studentId === studentId && t.date.startsWith(monthKey));
      
      const tuitionTx = studentTx.filter(t => t.type === 'tuition');
      const tuition = tuitionTx.reduce((sum, t) => sum + t.amount, 0);
      
      const transportTx = studentTx.filter(t => t.type === 'other' && t.otherPaymentName?.toLowerCase().includes('transport'));
      const transport = transportTx.reduce((sum, t) => sum + t.amount, 0);
      
      const uniformTx = studentTx.filter(t => t.type === 'uniform');
      let dress = 0;
      let tracksuit = 0;
      let shoes = 0;
      let shirt = 0;
      let shorts = 0;
      
      uniformTx.forEach(t => {
        const notesLower = t.notes?.toLowerCase() || '';
        if (notesLower.includes('dress')) {
          dress += t.amount;
        } else if (notesLower.includes('tracksuit') || t.amount === 45) {
          tracksuit += t.amount;
        } else if (notesLower.includes('shoes')) {
          shoes += t.amount;
        } else if (notesLower.includes('shirt')) {
          shirt += t.amount;
        } else if (notesLower.includes('shorts')) {
          shorts += t.amount;
        } else {
          if (t.amount === 45) tracksuit += t.amount;
          else if (t.amount === 25) shoes += t.amount;
          else if (t.amount === 35) dress += t.amount;
          else if (t.amount === 15) shirt += t.amount;
          else shorts += t.amount;
        }
      });
      
      const relishTx = studentTx.filter(t => t.type === 'relish');
      const relish = relishTx.reduce((sum, t) => sum + t.amount, 0);
      
      const otherTx = studentTx.filter(t => t.type === 'other' && !t.otherPaymentName?.toLowerCase().includes('transport'));
      const other = otherTx.reduce((sum, t) => sum + t.amount, 0);
      
      const total = tuition + transport + dress + tracksuit + shoes + shirt + shorts + relish + other;
      
      return {
        month,
        tuition,
        transport,
        dress,
        tracksuit,
        shoes,
        shirt,
        shorts,
        relish,
        other,
        total
      };
    });
  };

  const isPrimaryGrade = (grade: string) => {
    return grade.includes('ECD') || grade.includes('Grade');
  };

  const activeStudents = students
    .filter((student) => student.status === 'active')
    .filter((student) => viewMode === 'primary' ? isPrimaryGrade(student.grade) : !isPrimaryGrade(student.grade));

  // Calculate students with incomplete payments for current month
  const calculateIncompletePayments = () => {
    const currentMonth = '2026-02'; // February 2026 based on mock data
    
    const studentsWithPayments = activeStudents.filter((student) => {
      // Get all transactions for this student in current month
      const studentTransactions = mockTransactions.filter(
        (t) => t.studentId === student.id && t.date.startsWith(currentMonth)
      );
      
      // Calculate total paid
      const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Only count students who made some payment
      return totalPaid > 0;
    });
    
    const studentsWithIncompletePayments = studentsWithPayments.filter((student) => {
      // Get all transactions for this student in current month
      const studentTransactions = mockTransactions.filter(
        (t) => t.studentId === student.id && t.date.startsWith(currentMonth)
      );
      
      // Calculate total paid
      const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);
      
      // Expected fees: Tuition (registrationFeeAmount) + Transport (mock: $50 if using) + Uniform (from transactions)
      const tuitionFee = student.registrationFeeAmount * 10; // Monthly tuition (10x registration fee)
      const transportFee = 50; // Mock transport fee
      const uniformFee = studentTransactions.find(t => t.type === 'uniform')?.amount || 0;
      
      const expectedTotal = tuitionFee + transportFee + uniformFee;
      
      // Check if payment is incomplete (paid less than 80% of expected)
      return totalPaid < expectedTotal * 0.8;
    });
    
    return {
      incomplete: studentsWithIncompletePayments.length,
      total: studentsWithPayments.length,
      students: studentsWithIncompletePayments
    };
  };

  const paymentStats = calculateIncompletePayments();
  const transferredStudents = students.filter((student) => student.status === 'transferred');
  const displayedStudents = showTransferredOnly 
    ? transferredStudents 
    : (showIncompleteOnly 
        ? paymentStats.students 
        : activeStudents);
  const newThisWeekCount = activeStudents.filter((student) => student.daysJoined <= 7).length;
  const safetyNetCount = transferredStudents.length;
  const recentTransferred = transferredStudents[0];
  const recentTransferDate = recentTransferred?.transferDate ? new Date(recentTransferred.transferDate) : undefined;

  const getStudentDebt = (student: any) => {
    const currentMonth = '2026-02';
    const studentTransactions = mockTransactions.filter(
      (t) => t.studentId === student.id && t.date.startsWith(currentMonth)
    );
    const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const tuitionFee = student.registrationFeeAmount * 10;
    const transportFee = 50;
    const uniformFee = studentTransactions.find(t => t.type === 'uniform')?.amount || 0;
    const expectedTotal = tuitionFee + transportFee + uniformFee;
    return Math.max(0, expectedTotal - totalPaid);
  };

  const handleTransfer = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, status: 'transferred' as const, transferDate: new Date().toISOString() }
          : student
      )
    );
    toast.info('Student transferred', {
      description: '180-day countdown started. Use Recover to restore.',
    });
  };

  const handleRecover = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, status: 'active' as const, transferDate: undefined }
          : student
      )
    );
    toast.success('Student recovered!', {
      description: 'Active status restored.',
    });
  };

  const handleBulkAction = (action: 'promote' | 'transfer') => {
    if (selectedStudents.length === 0) {
      toast.error('No students selected');
      return;
    }

    if (action === 'promote') {
      toast.success(`${selectedStudents.length} students promoted!`);
    } else {
      toast.info(`${selectedStudents.length} students transferred`);
    }

    setSelectedStudents([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Student Tracer</h1>
        <p className="text-muted-foreground font-['Inter']">
          Monitor current learners and recover recent transfers.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <GlassCard
          hover
          onClick={() => setViewMode(viewMode === 'primary' ? 'secondary' : 'primary')}
          className={`cursor-pointer border ${viewMode === 'primary' ? 'border-[#3B82F6] dark:border-[#3B82F6] hover:border-[#3B82F6] dark:hover:border-[#3B82F6]' : 'border-[#10B981] dark:border-[#10B981] hover:border-[#10B981] dark:hover:border-[#10B981]'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">{viewMode === 'primary' ? 'Primary View' : 'Secondary View'}</p>
              <p className="text-base font-['Inter'] text-[#6B7280]">
                {viewMode === 'primary' ? (
                  <>
                    Now you are seeing <span className="text-[#3B82F6] font-semibold">PRIMARY SCHOOL STUDENTS</span>. Press <span className="text-[#3B82F6] font-semibold">HERE</span> to see Secondary students only.
                  </>
                ) : (
                  <>
                    Now you are seeing <span className="text-[#10B981] font-semibold">SECONDARY SCHOOL STUDENTS</span>. Press <span className="text-[#10B981] font-semibold">HERE</span> to see Primary students only.
                  </>
                )}
              </p>
            </div>
            <div className={viewMode === 'primary' ? 'p-3 rounded-[20px] bg-[#3B82F6]/10' : 'p-3 rounded-[20px] bg-[#10B981]/10'}>
              <ArrowRight className={viewMode === 'primary' ? 'w-6 h-6 text-[#3B82F6]' : 'w-6 h-6 text-[#10B981]'} />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard hover>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-['Inter'] mb-1">Active Students</p>
              <p className="text-3xl font-['Space_Grotesk'] text-[#10B981]">{activeStudents.length}</p>
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
              <p className="text-3xl font-['Space_Grotesk'] text-[#3B82F6]">{newThisWeekCount}</p>
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
              <p className="text-3xl font-['Space_Grotesk'] text-[#EF4444]">{safetyNetCount}</p>
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
              <p className="text-3xl font-['Space_Grotesk'] text-[#F59E0B]">{paymentStats.incomplete}/{paymentStats.total} students</p>
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
              : `border ${viewMode === 'primary' ? 'border-[#3B82F6] dark:border-[#3B82F6]' : 'border-[#10B981] dark:border-[#10B981]'}`)
      }>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-['Space_Grotesk'] text-lg">
              {showTransferredOnly ? 'Transferred Students' : (showIncompleteOnly ? 'Incomplete Payments' : 'Active Students')}
            </h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              {showTransferredOnly 
                ? 'Students in the safety net (recently transferred).' 
                : (showIncompleteOnly 
                    ? 'Overview of students who paid less than 80% of expected monthly fees.' 
                    : 'Overview of all enrolled students and their current status.')}
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
          <Table>
            <TableHeader>
              <TableRow className={cn(
                "dark:hover:bg-white/5 hover:bg-gray-50 transition-colors",
                viewMode === 'primary' 
                  ? "border-b border-[#3B82F6]/30 dark:border-[#3B82F6]/30" 
                  : "border-b border-[#10B981]/30 dark:border-[#10B981]/30"
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
              {displayedStudents.map((student) => (
                <Fragment key={student.id}>
                  <TableRow 
                    onClick={() => toggleStudentProfile(student.id)}
                    className={cn(
                      "dark:hover:bg-white/5 hover:bg-gray-50 transition-colors cursor-pointer",
                      expandedStudentId === student.id && "bg-muted/30 dark:bg-white/5",
                      viewMode === 'primary' 
                        ? "border-b border-[#3B82F6]/20 dark:border-[#3B82F6]/20" 
                        : "border-b border-[#10B981]/20 dark:border-[#10B981]/20"
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
                          ${getStudentDebt(student).toFixed(2)}
                        </span>
                      ) : showTransferredOnly ? (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleRecover(student.id); }}
                          variant="ghost"
                          size="sm"
                          className="rounded-[20px] hover:bg-[#10B981]/10 hover:text-[#10B981] font-['Inter']"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Recover
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleTransfer(student.id); }}
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
                  {expandedStudentId === student.id && (
                    <TableRow className="bg-muted/10 dark:bg-black/10 hover:bg-transparent">
                      <TableCell colSpan={5} className="p-4">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 rounded-[20px] bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-2 border-blue-200 dark:border-blue-700">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-['Space_Grotesk'] text-lg text-blue-600 dark:text-blue-400">
                                {student.registrationNumber} - {student.name} - Payment Analysis (Last 6 Months)
                              </h4>
                              <Button
                                onClick={(e) => { e.stopPropagation(); toggleStudentProfile(student.id); }}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 text-red-500 rounded-full"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
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
                                  {getFinancialProfile(student.id).map((row) => (
                                    <tr key={row.month} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-blue-900/20 transition-all duration-200 border-b border-gray-100 dark:border-gray-700">
                                      <td className="p-1.5 md:p-2 font-medium text-xs font-['Space_Grotesk'] text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600">{row.month}</td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.tuition > 0 ? (
                                          <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${row.tuition.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.transport > 0 ? (
                                          <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${row.transport.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.dress > 0 ? (
                                          <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${row.dress.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.tracksuit > 0 ? (
                                          <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${row.tracksuit.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.shoes > 0 ? (
                                          <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${row.shoes.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.shirt > 0 ? (
                                          <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${row.shirt.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.shorts > 0 ? (
                                          <div className="p-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-blue-600 dark:text-blue-400 font-bold">${row.shorts.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1 text-center border-r border-gray-200 dark:border-gray-600">
                                        {row.relish > 0 ? (
                                          <div className="p-1 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 min-w-[75px]">
                                            <div className="font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold">${row.relish.toFixed(2)}</div>
                                          </div>
                                        ) : (
                                          <div className="p-1 text-xs text-gray-400 dark:text-gray-500">-</div>
                                        )}
                                      </td>
                                      <td className="p-1.5 md:p-2 text-center font-['Space_Grotesk'] text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 border-l-2 border-green-300 dark:border-green-600">${row.total.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
