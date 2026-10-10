import { useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { mockExpenses } from '../data/mockData';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function Expenses() {
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
  });

  // Calculate budget usage by category
  const budgetsByCategory = mockExpenses.reduce((acc, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = {
        spent: 0,
        limit: expense.budgetLimit || 0,
      };
    }
    acc[expense.category].spent += expense.amount;
    return acc;
  }, {} as Record<string, { spent: number; limit: number }>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Expense Logged!', {
      description: `${formData.category}: $${formData.amount}`,
    });
    setFormData({ category: '', description: '', amount: '' });
  };

  const totalBudget = Object.values(budgetsByCategory).reduce((sum, cat) => sum + cat.limit, 0);
  const totalSpent = Object.values(budgetsByCategory).reduce((sum, cat) => sum + cat.spent, 0);
  const burnRate = (totalSpent / totalBudget) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Expense Logger</h1>
        <p className="text-muted-foreground font-['Inter']">
          Track spending and monitor burn rate
        </p>
      </div>

      {/* Monthly Burn Rate */}
      <GlassCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-['Space_Grotesk'] text-lg">Monthly Burn Rate</h3>
            <p className="text-sm text-muted-foreground font-['Inter']">
              ${totalSpent.toFixed(2)} of ${totalBudget.toFixed(2)} budget used
            </p>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-['Space_Grotesk'] ${
              burnRate >= 80 ? 'text-[#EF4444]' : burnRate >= 60 ? 'text-[#F59E0B]' : 'text-[#10B981]'
            }`}>
              {burnRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <Progress
          value={burnRate}
          className={`h-3 ${
            burnRate >= 80 ? 'animate-pulse' : ''
          }`}
        />
      </GlassCard>

      {/* Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(budgetsByCategory).map(([category, data]) => {
          const percentage = (data.spent / data.limit) * 100;
          const isWarning = percentage >= 80;
          
          return (
            <motion.div
              key={category}
              animate={isWarning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <GlassCard className={isWarning ? 'border-[#F59E0B]/50' : ''}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-['Inter'] capitalize">{category}</h4>
                    {isWarning && (
                      <AlertCircle className="w-5 h-5 text-[#F59E0B] animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-['Space_Grotesk']">
                      ${data.spent}
                    </span>
                    <span className="text-sm text-muted-foreground font-['Inter']">
                      / ${data.limit}
                    </span>
                  </div>
                  <Progress
                    value={percentage}
                    className={`h-2 ${isWarning ? 'animate-pulse' : ''}`}
                  />
                  <p className={`text-xs font-['Inter'] ${
                    isWarning ? 'text-[#F59E0B]' : 'text-muted-foreground'
                  }`}>
                    {percentage.toFixed(1)}% of budget
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Log Expense Form */}
      <GlassCard className="dark:border-[#EF4444]/30 dark:bg-gradient-to-br dark:from-[#EF4444]/10 dark:to-[#1F2937] dark:bg-[#1F2937] border border-gray-200 bg-gray-50">
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Log New Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="font-['Inter']">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 bg-white border-gray-200 focus:border-[#EF4444] focus:ring-[#EF4444]">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wifi">WiFi</SelectItem>
                  <SelectItem value="salaries">Salaries</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#EF4444] dark:focus:ring-[#EF4444] bg-white border-gray-200 focus:border-[#EF4444] focus:ring-[#EF4444]"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-['Inter']">
              Description
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What was this expense for?"
              className="rounded-[20px] font-['Inter'] dark:bg-white/5 dark:border-white/10 dark:focus:border-[#EF4444] dark:focus:ring-[#EF4444] bg-white border-gray-200 focus:border-[#EF4444] focus:ring-[#EF4444]"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-[20px] bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white h-12 font-['Space_Grotesk']"
          >
            Log Expense
          </Button>
        </form>
      </GlassCard>

      {/* Recent Expenses */}
      <GlassCard>
        <h3 className="font-['Space_Grotesk'] text-lg mb-4">Recent Expenses</h3>
        <div className="space-y-3">
          {mockExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-3 rounded-[20px] transition-all dark:bg-white/5 dark:hover:bg-white/10 bg-gray-50 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-['Inter']">{expense.description}</p>
                <p className="text-xs text-muted-foreground font-['Inter'] capitalize">
                  {expense.category} • {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
              <span className="text-lg font-['Space_Grotesk'] text-[#EF4444]">
                -${expense.amount}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
