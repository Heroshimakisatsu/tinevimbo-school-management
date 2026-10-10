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
import { Printer, Mail, Download } from 'lucide-react';
import { motion } from 'motion/react';

export function Finance() {
  const [paymentType, setPaymentType] = useState('');
  const [uniformSize, setUniformSize] = useState('');
  const [otherPaymentName, setOtherPaymentName] = useState('');
  const [receiptNumber, setReceiptNumber] = useState(1008); // Start from next number
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchInput, setSearchInput] = useState(''); // Separate state for input field
  const [formData, setFormData] = useState({
    registrationNumber: '',
    studentName: '',
    studentGrade: '',
    amount: '',
    paymentMethod: '',
  });

  // Auto-increment receipt number
  useEffect(() => {
    const maxReceipt = Math.max(...mockTransactions.map(t => t.receiptNumber));
    setReceiptNumber(maxReceipt + 1);
  }, []);

  // Find student by registration number or name
  const findStudent = (searchTerm: string) => {
    return mockStudents.find(student => 
      student.registrationNumber?.toLowerCase() === searchTerm.toLowerCase() ||
      student.name.toLowerCase() === searchTerm.toLowerCase()
    );
  };

  // Calculate student payment status
  const getStudentPaymentStatus = (student: any) => {
    if (!student) return null;
    
    const studentTransactions = mockTransactions.filter(t => 
      t.registrationNumber === student.registrationNumber
    );
    
    const totalPaid = studentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const registrationFee = student.registrationFeeAmount || 0;
    const tuitionFee = 150; // Default tuition fee
    const totalFees = registrationFee + tuitionFee;
    const balance = totalFees - totalPaid;
    const status = balance <= 0 ? 'Paid' : 'Partial';
    
    return {
      totalFees,
      totalPaid,
      balance,
      status,
      percentage: Math.round((totalPaid / totalFees) * 100)
    };
  };

  // Get last 6 months of payments for a student
  const getLast6MonthsPayments = (student: any) => {
    if (!student) return [];
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    return mockTransactions
      .filter(t => 
        t.registrationNumber === student.registrationNumber &&
        new Date(t.date) >= sixMonthsAgo
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Calculate monthly payment summary by type
  const getMonthlyPaymentSummary = (student: any) => {
    const payments = getLast6MonthsPayments(student);
    const summary: { [key: string]: { tuition: any[], uniform: any[], relish: any[], other: any[] } } = {};
    
    payments.forEach(payment => {
      const month = new Date(payment.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!summary[month]) {
        summary[month] = { tuition: [], uniform: [], relish: [], other: [] };
      }
      
      // Add payment to appropriate type array
      if (payment.type === 'tuition') {
        summary[month].tuition.push(payment);
      } else if (payment.type === 'uniform') {
        summary[month].uniform.push(payment);
      } else if (payment.type === 'relish') {
        summary[month].relish.push(payment);
      } else {
        summary[month].other.push(payment);
      }
    });
    
    return summary;
  };

  // Get comprehensive payment analysis for selected student
  const getStudentPaymentAnalysis = (student: any) => {
    if (!student) return null;

    // Generate mock payment data based on student's registration number for variety
    const baseReceipt = parseInt(student.registrationNumber.replace('REG', '')) || 1000;
    
    const mockPayments = [
      { 
        month: 'Feb 2026', 
        tuition: { date: '15/02/2026', receipt: (baseReceipt + 1).toString(), amount: 30 }, 
        transport: { date: '15/02/2026', receipt: (baseReceipt + 2).toString(), amount: 25 }, 
        uniformDress: { date: '20/02/2026', receipt: (baseReceipt + 3).toString(), amount: 45 }, 
        uniformTracksuit: { date: '20/02/2026', receipt: (baseReceipt + 4).toString(), amount: 35 }, 
        uniformShoes: { date: '25/02/2026', receipt: (baseReceipt + 5).toString(), amount: 40 }, 
        uniformShirt: { date: '25/02/2026', receipt: (baseReceipt + 6).toString(), amount: 25 }, 
        uniformShorts: { date: '25/02/2026', receipt: (baseReceipt + 7).toString(), amount: 20 }, 
        relish: { date: '28/02/2026', receipt: (baseReceipt + 8).toString(), amount: 15 }, 
        other: { date: '', receipt: '', amount: 0 }, 
        total: 235 
      },
      { 
        month: 'Jan 2026', 
        tuition: { date: '15/01/2026', receipt: (baseReceipt + 9).toString(), amount: 30 }, 
        transport: { date: '15/01/2026', receipt: (baseReceipt + 10).toString(), amount: 25 }, 
        uniformDress: { date: '', receipt: '', amount: 0 }, 
        uniformTracksuit: { date: '', receipt: '', amount: 0 }, 
        uniformShoes: { date: '', receipt: '', amount: 0 }, 
        uniformShirt: { date: '20/01/2026', receipt: (baseReceipt + 11).toString(), amount: 15 }, 
        uniformShorts: { date: '20/01/2026', receipt: (baseReceipt + 12).toString(), amount: 15 }, 
        relish: { date: '25/01/2026', receipt: (baseReceipt + 13).toString(), amount: 15 }, 
        other: { date: '30/01/2026', receipt: (baseReceipt + 14).toString(), amount: 10 }, 
        total: 100 
      },
      { 
        month: 'Dec 2025', 
        tuition: { date: '15/12/2025', receipt: (baseReceipt + 15).toString(), amount: 30 }, 
        transport: { date: '15/12/2025', receipt: (baseReceipt + 16).toString(), amount: 25 }, 
        uniformDress: { date: '', receipt: '', amount: 0 }, 
        uniformTracksuit: { date: '', receipt: '', amount: 0 }, 
        uniformShoes: { date: '', receipt: '', amount: 0 }, 
        uniformShirt: { date: '', receipt: '', amount: 0 }, 
        uniformShorts: { date: '', receipt: '', amount: 0 }, 
        relish: { date: '20/12/2025', receipt: (baseReceipt + 17).toString(), amount: 15 }, 
        other: { date: '', receipt: '', amount: 0 }, 
        total: 70 
      },
      { 
        month: 'Nov 2025', 
        tuition: { date: '15/11/2025', receipt: (baseReceipt + 18).toString(), amount: 30 }, 
        transport: { date: '15/11/2025', receipt: (baseReceipt + 19).toString(), amount: 25 }, 
        uniformDress: { date: '20/11/2025', receipt: (baseReceipt + 20).toString(), amount: 45 }, 
        uniformTracksuit: { date: '', receipt: '', amount: 0 }, 
        uniformShoes: { date: '', receipt: '', amount: 0 }, 
        uniformShirt: { date: '', receipt: '', amount: 0 }, 
        uniformShorts: { date: '', receipt: '', amount: 0 }, 
        relish: { date: '25/11/2025', receipt: (baseReceipt + 21).toString(), amount: 15 }, 
        other: { date: '30/11/2025', receipt: (baseReceipt + 22).toString(), amount: 5 }, 
        total: 120 
      },
      { 
        month: 'Oct 2025', 
        tuition: { date: '15/10/2025', receipt: (baseReceipt + 23).toString(), amount: 30 }, 
        transport: { date: '15/10/2025', receipt: (baseReceipt + 24).toString(), amount: 25 }, 
        uniformDress: { date: '', receipt: '', amount: 0 }, 
        uniformTracksuit: { date: '22/10/2025', receipt: (baseReceipt + 25).toString(), amount: 35 }, 
        uniformShoes: { date: '', receipt: '', amount: 0 }, 
        uniformShirt: { date: '', receipt: '', amount: 0 }, 
        uniformShorts: { date: '', receipt: '', amount: 0 }, 
        relish: { date: '25/10/2025', receipt: (baseReceipt + 26).toString(), amount: 15 }, 
        other: { date: '', receipt: '', amount: 0 }, 
        total: 105 
      },
      { 
        month: 'Sep 2025', 
        tuition: { date: '15/09/2025', receipt: (baseReceipt + 27).toString(), amount: 30 }, 
        transport: { date: '15/09/2025', receipt: (baseReceipt + 28).toString(), amount: 25 }, 
        uniformDress: { date: '', receipt: '', amount: 0 }, 
        uniformTracksuit: { date: '', receipt: '', amount: 0 }, 
        uniformShoes: { date: '20/09/2025', receipt: (baseReceipt + 29).toString(), amount: 40 }, 
        uniformShirt: { date: '', receipt: '', amount: 0 }, 
        uniformShorts: { date: '', receipt: '', amount: 0 }, 
        relish: { date: '25/09/2025', receipt: (baseReceipt + 30).toString(), amount: 15 }, 
        other: { date: '', receipt: '', amount: 0 }, 
        total: 110 
      },
    ];

    const totals = mockPayments.reduce((acc, payment) => ({
      tuition: acc.tuition + payment.tuition.amount,
      transport: acc.transport + payment.transport.amount,
      uniformDress: acc.uniformDress + payment.uniformDress.amount,
      uniformTracksuit: acc.uniformTracksuit + payment.uniformTracksuit.amount,
      uniformShoes: acc.uniformShoes + payment.uniformShoes.amount,
      uniformShirt: acc.uniformShirt + payment.uniformShirt.amount,
      uniformShorts: acc.uniformShorts + payment.uniformShorts.amount,
      relish: acc.relish + payment.relish.amount,
      other: acc.other + payment.other.amount,
      total: acc.total + payment.total,
    }), { tuition: 0, transport: 0, uniformDress: 0, uniformTracksuit: 0, uniformShoes: 0, uniformShirt: 0, uniformShorts: 0, relish: 0, other: 0, total: 0 });

    return { student, payments: mockPayments, totals };
  };

  // Handle student search
  const handleStudentSearch = (value: string) => {
    setSearchInput(value); // Update the input field separately
    
    const student = findStudent(value);
    setSelectedStudent(student);
    
    if (student) {
      setFormData({
        ...formData,
        registrationNumber: student.registrationNumber || '',
        studentName: student.name,
        studentGrade: student.grade,
      });
    } else {
      setFormData({
        ...formData,
        registrationNumber: value,
        studentName: value,
        studentGrade: '',
      });
    }
  };

  // Get payment analysis for selected student
  const paymentAnalysis = getStudentPaymentAnalysis(selectedStudent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Increment receipt number for next transaction
    setReceiptNumber(prev => prev + 1);
    
    toast.success('Payment Recorded!', {
      description: `$${formData.amount} from ${formData.studentName} - Receipt #${receiptNumber}`,
    });
    
    // Reset form
    setFormData({
      registrationNumber: '',
      studentName: '',
      studentGrade: '',
      amount: '',
      paymentMethod: '',
    });
    setSearchInput(''); // Reset the input field
    setPaymentType('');
    setUniformSize('');
    setOtherPaymentName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Finance Ledger</h1>
        <p className="text-muted-foreground font-['Inter']">
          Keyboard-optimized payment processing
        </p>
      </div>

      {/* Payment Form */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Record New Payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receipt Number */}
          <div className="space-y-2">
            <Label htmlFor="receiptNumber" className="font-['Inter']">
              Receipt Number
            </Label>
            <Input
              id="receiptNumber"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(parseInt(e.target.value) || 0)}
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              placeholder="Auto-incremented"
            />
            <p className="text-xs text-muted-foreground font-['Inter']">
              Auto-increments per transaction (adjustable for sync with physical receipt book)
            </p>
          </div>

          {/* Registration Number/Student Name - Above Payment Analysis */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber" className="font-['Inter']">
              Registration Number/Student Name
            </Label>
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

          {/* Student Payment Analysis Table */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            {selectedStudent ? (
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-2 border-blue-200 dark:border-blue-700">
                <h4 className="font-['Space_Grotesk'] text-lg mb-3 text-blue-600 dark:text-blue-400">
                  {selectedStudent.registrationNumber} - {selectedStudent.name} - Payment Analysis (Last 6 Months)
                </h4>
              
              {/* Payment Analysis Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30">
                      <th className="text-left p-3 font-['Space_Grotesk'] font-semibold text-blue-700 dark:text-blue-300 border-b-2 border-blue-200 dark:border-blue-600">Month</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Tuition</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Transport</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Dress</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Tracksuit</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Shoes</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Shirt</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-blue-600 dark:text-blue-400 border-b-2 border-blue-200 dark:border-blue-600">Shorts</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Relish</th>
                      <th className="text-center p-3 font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400 border-b-2 border-green-200 dark:border-green-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAnalysis?.payments.map((payment: any, index: number) => (
                      <tr key={index} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-blue-900/20 transition-all duration-200 border-b border-gray-100 dark:border-gray-700">
                        <td className="p-3 font-medium font-['Space_Grotesk'] text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600">{payment.month}</td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.tuition.amount > 0 ? (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 mb-1">#{payment.tuition.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.tuition.date}</div>
                              <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${payment.tuition.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.transport.amount > 0 ? (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                              <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 mb-1">#{payment.transport.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.transport.date}</div>
                              <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${payment.transport.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformDress.amount > 0 ? (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 mb-1">#{payment.uniformDress.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.uniformDress.date}</div>
                              <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${payment.uniformDress.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformTracksuit.amount > 0 ? (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                              <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 mb-1">#{payment.uniformTracksuit.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.uniformTracksuit.date}</div>
                              <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${payment.uniformTracksuit.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShoes.amount > 0 ? (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 mb-1">#{payment.uniformShoes.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.uniformShoes.date}</div>
                              <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${payment.uniformShoes.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShirt.amount > 0 ? (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                              <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 mb-1">#{payment.uniformShirt.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.uniformShirt.date}</div>
                              <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${payment.uniformShirt.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.uniformShorts.amount > 0 ? (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                              <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 mb-1">#{payment.uniformShorts.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.uniformShorts.date}</div>
                              <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${payment.uniformShorts.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-2 text-center border-r border-gray-200 dark:border-gray-600">
                          {payment.relish.amount > 0 ? (
                            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                              <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 mb-1">#{payment.relish.receipt}</div>
                              <div className="text-xs font-['Inter'] text-gray-600 dark:text-gray-400 mb-1">{payment.relish.date}</div>
                              <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${payment.relish.amount}</div>
                            </div>
                          ) : (
                            <div className="p-2 text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="p-3 text-center font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 border-l-2 border-green-300 dark:border-green-600">{payment.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-gradient-to-r from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900/30 font-bold">
                      <td className="p-3 font-['Space_Grotesk'] text-gray-800 dark:text-gray-200 border-r-2 border-gray-300 dark:border-gray-600">TOTAL</td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                          <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 font-bold">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.tuition}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600">
                          <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 font-bold">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.transport}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                          <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 font-bold">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformDress}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600">
                          <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 font-bold">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.uniformTracksuit}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                          <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 font-bold">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformShoes}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600">
                          <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 font-bold">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.uniformShirt}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                          <div className="text-xs font-['Inter'] text-blue-600 dark:text-blue-400 font-bold">2 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-blue-600 dark:text-blue-400 font-bold">${paymentAnalysis?.totals.uniformShorts}</div>
                        </div>
                      </td>
                      <td className="p-2 text-center border-r-2 border-gray-300 dark:border-gray-600">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-600">
                          <div className="text-xs font-['Inter'] text-green-600 dark:text-green-400 font-bold">6 Receipts</div>
                          <div className="font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold">${paymentAnalysis?.totals.relish}</div>
                        </div>
                      </td>
                      <td className="p-3 text-center font-['Space_Grotesk'] text-green-600 dark:text-green-400 font-bold text-lg bg-green-100 dark:bg-green-900/30 border-l-2 border-green-400 dark:border-green-600">
                        ${paymentAnalysis?.totals.total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-muted-foreground font-['Inter']">Monthly Tuition</div>
                  <div className="font-['Space_Grotesk'] text-sm text-blue-600 dark:text-blue-400">$30</div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-muted-foreground font-['Inter']">Monthly Transport</div>
                  <div className="font-['Space_Grotesk'] text-sm text-green-600 dark:text-green-400">$25</div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-muted-foreground font-['Inter']">Uniform Items</div>
                  <div className="font-['Space_Grotesk'] text-sm text-blue-600 dark:text-blue-400">6 Types</div>
                </div>
                <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                  <div className="text-xs text-muted-foreground font-['Inter']">6-Month Total</div>
                  <div className="font-['Space_Grotesk'] text-sm text-green-600 dark:text-green-400">
                    ${paymentAnalysis?.totals.total}
                  </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Student Grade (Auto-filled) */}
            <div className="space-y-2">
              <Label htmlFor="studentGrade" className="font-['Inter']">
                Student Grade
              </Label>
              <Input
                id="studentGrade"
                value={formData.studentGrade}
                onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                placeholder="Auto-filled from search"
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
              />
              <p className="text-xs text-muted-foreground font-['Inter']">
                Auto-populated from student search (adjustable for syncing)
              </p>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="font-['Inter']">
              Amount ($)
            </Label>
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
            <Label htmlFor="paymentMethod" className="font-['Inter']">
              Payment Method
            </Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
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
            <Label htmlFor="paymentType" className="font-['Inter']">
              Payment Type
            </Label>
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

          {/* Smart Dropdown - Uniform Size Selector */}
          {paymentType === 'uniform' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-[20px] bg-[#3B82F6]/10 border border-[#3B82F6]/30"
            >
              <Label className="font-['Inter'] text-[#3B82F6] mb-3 block">
                Select Uniform Size
              </Label>
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

          {/* Other Payment Name Field */}
          {paymentType === 'other' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="otherPaymentName" className="font-['Inter']">
                Payment Name
              </Label>
              <Input
                id="otherPaymentName"
                value={otherPaymentName}
                onChange={(e) => setOtherPaymentName(e.target.value)}
                placeholder="Enter payment type name..."
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#10B981] dark:focus:ring-[#10B981] bg-white border-gray-200 focus:border-[#10B981] focus:ring-[#10B981]"
                required
              />
              <p className="text-xs text-muted-foreground font-['Inter']">
                Specify the name of the payment type
              </p>
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
            {/* Payment Status Card */}
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-['Space_Grotesk'] text-lg text-blue-600 dark:text-blue-400">
                    {selectedStudent.name}
                  </h4>
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
                    <span className="font-['Space_Grotesk'] font-semibold">
                      ${(getStudentPaymentStatus(selectedStudent)?.totalFees || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-['Inter']">Amount Paid:</span>
                    <span className="font-['Space_Grotesk'] font-semibold text-green-600 dark:text-green-400">
                      ${(getStudentPaymentStatus(selectedStudent)?.totalPaid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-['Inter']">Balance:</span>
                    <span className={`font-['Space_Grotesk'] font-semibold ${
                      (getStudentPaymentStatus(selectedStudent)?.balance || 0) <= 0 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${Math.abs(getStudentPaymentStatus(selectedStudent)?.balance || 0).toFixed(2)}
                      {(getStudentPaymentStatus(selectedStudent)?.balance || 0) > 0 ? ' (Owed)' : ' (Credit)'}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
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
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
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
                    
                    {/* Tuition Payments */}
                    {data.tuition.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-['Inter'] rounded">
                            TUITION
                          </span>
                          <span className="text-sm font-medium font-['Inter']">Tuition Fees</span>
                        </div>
                        {data.tuition.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">
                                ${payment.amount}
                              </span>
                              <span className="text-xs text-muted-foreground font-['Inter']">
                                {payment.paymentMethod}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Uniform Payments */}
                    {data.uniform.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 text-xs font-['Inter'] rounded">
                            UNIFORM
                          </span>
                          <span className="text-sm font-medium font-['Inter']">Uniform Fees</span>
                        </div>
                        {data.uniform.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                              {payment.uniformSize && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs font-['Inter'] rounded ml-2">
                                  Size: {payment.uniformSize}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">
                                ${payment.amount}
                              </span>
                              <span className="text-xs text-muted-foreground font-['Inter']">
                                {payment.paymentMethod}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Relish Payments */}
                    {data.relish.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs font-['Inter'] rounded">
                            RELISH
                          </span>
                          <span className="text-sm font-medium font-['Inter']">Relish Fees</span>
                        </div>
                        {data.relish.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">
                                ${payment.amount}
                              </span>
                              <span className="text-xs text-muted-foreground font-['Inter']">
                                {payment.paymentMethod}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Other Payments */}
                    {data.other.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs font-['Inter'] rounded">
                            OTHER
                          </span>
                          <span className="text-sm font-medium font-['Inter']">Other Payments</span>
                        </div>
                        {data.other.map((payment, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-['Inter']">Receipt #{payment.receiptNumber}</span>
                              <span className="text-sm font-['Inter']">{new Date(payment.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="font-['Space_Grotesk'] text-green-600 dark:text-green-400">
                                  ${payment.amount}
                                </span>
                                <span className="text-xs text-muted-foreground font-['Inter'] block">
                                  {payment.paymentMethod}
                                </span>
                                {payment.otherPaymentName && (
                                  <span className="text-xs text-blue-600 dark:text-blue-400 block">
                                    {payment.otherPaymentName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Transaction History */}
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
                <TableHead className="font-['Inter']">Amount</TableHead>
                <TableHead className="font-['Inter']">Method</TableHead>
                <TableHead className="font-['Inter']">Date</TableHead>
                <TableHead className="font-['Inter']">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="dark:border-white/10 dark:hover:bg-white/5 border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-['Inter'] font-mono text-sm">#{transaction.receiptNumber}</TableCell>
                  <TableCell className="font-['Inter']">
                    <div>
                      <div className="font-medium">{transaction.studentName}</div>
                      <div className="text-xs text-muted-foreground">{transaction.registrationNumber}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-['Inter']">{transaction.studentGrade}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-['Inter']">
                      {transaction.type === 'other' ? transaction.otherPaymentName : transaction.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#10B981] font-['Space_Grotesk']">
                    ${transaction.amount}
                  </TableCell>
                  <TableCell className="font-['Inter'] capitalize">{transaction.paymentMethod}</TableCell>
                  <TableCell className="font-['Inter']">
                    {new Date(transaction.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 group">
                      <button
                        className="p-2 rounded-[20px] hover:bg-white/10 transition-all"
                        title="Print Receipt"
                        onClick={() => toast.info('Receipt sent to printer')}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-[20px] hover:bg-white/10 transition-all"
                        title="Email to Parent"
                        onClick={() => toast.success('Receipt emailed to parent')}
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-[20px] hover:bg-white/10 transition-all"
                        title="Download PDF"
                        onClick={() => toast.success('PDF downloaded')}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
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
