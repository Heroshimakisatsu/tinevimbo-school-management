import { GlassCard } from '../components/GlassCard';
import { Settings, Database, Bell, Shield, Download, Upload, Table, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { calculateStats, mockStudents, mockTransactions, mockExpenses } from '../data/mockData';

export function Management() {
  const stats = calculateStats();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">System Management</h1>
        <p className="text-muted-foreground font-['Inter']">
          Configure settings and manage system operations
        </p>
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
                <p className="text-2xl font-['Space_Grotesk'] mt-1">{stats.activeStudents + stats.pendingDeletions}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Total Transactions</p>
                <p className="text-2xl font-['Space_Grotesk'] mt-1">7</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Database Size</p>
                <p className="text-2xl font-['Space_Grotesk'] mt-1">2.4 MB</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-['Inter']">Last Backup</p>
                <p className="text-sm font-['Inter'] mt-1">Today, 6:00 AM</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Database Simulation */}
      <GlassCard>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-[20px] bg-[#8B5CF6]/10">
            <Table className="w-6 h-6 text-[#8B5CF6]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Space_Grotesk'] text-lg">Database Structure</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              SQLite database tables and schema overview
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
                <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-['Inter']">{mockStudents.length} records</span>
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
                  {mockStudents.map((student) => (
                    <tr key={student.id} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.id}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.registrationNumber}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.name}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.grade}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.registrationFeePaid ? 'Yes' : 'No'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{student.status}</td>
                    </tr>
                  ))}
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
                <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-full font-['Inter']">{mockTransactions.length} records</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-['Inter']">
                <thead>
                  <tr className="bg-green-50 dark:bg-green-900/20">
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Receipt#</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Student</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Type</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Amount</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Date</th>
                    <th className="p-2 text-left text-green-700 dark:text-green-300 font-semibold">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.receiptNumber}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.studentName}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.type}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">${transaction.amount}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.date}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{transaction.paymentMethod}</td>
                    </tr>
                  ))}
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
                <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-2 py-1 rounded-full font-['Inter']">{mockExpenses.length} records</span>
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
                  {mockExpenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="p-2 text-gray-700 dark:text-gray-300">{expense.id}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{expense.category}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{expense.description}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">${expense.amount}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{expense.date}</td>
                    </tr>
                  ))}
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
