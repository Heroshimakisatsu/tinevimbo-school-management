import { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { api } from '../../utils/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

// Hardcoded budget limits mapped to standard expense categories
const BUDGET_LIMITS: Record<string, number> = {
  wifi: 100,
  salaries: 3000,
  utilities: 200,
  supplies: 400,
  maintenance: 200,
  other: 500
};

export function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
  });

  const loadExpenseData = async () => {
    try {
      setLoading(true);
      const [expensesList, expenseTypes] = await Promise.all([
        api.get<any[]>('/expenses'),
        api.get<any[]>('/expense-types')
      ]);
      setExpenses(expensesList);
      setCategories(expenseTypes.filter(c => c.is_active === 1));
    } catch (error) {
      console.error('Failed to load expenses details:', error);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenseData();
  }, []);

  // Calculate budget usage by category dynamically based on the current month's expenses
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthStr));

  const budgetsByCategory = currentMonthExpenses.reduce((acc, expense) => {
    const cat = expense.expense_type;
    if (!acc[cat]) {
      acc[cat] = {
        spent: 0,
        limit: BUDGET_LIMITS[cat] || BUDGET_LIMITS['other'],
      };
    }
    acc[cat].spent += expense.amount;
    return acc;
  }, {} as Record<string, { spent: number; limit: number }>);

  // Ensure all active categories appear in the budget list even if they have $0 spent
  categories.forEach(cat => {
    if (!budgetsByCategory[cat.name]) {
      budgetsByCategory[cat.name] = {
        spent: 0,
        limit: BUDGET_LIMITS[cat.name] || BUDGET_LIMITS['other']
      };
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        expenses: [
          {
            expense_type: formData.category,
            description: formData.description,
            amount: parseFloat(formData.amount),
          }
        ]
      };

      await api.post('/expenses/bulk', payload);

      toast.success('Expense Logged Successfully!', {
        description: `${formData.category}: $${formData.amount}`,
      });
      
      setFormData({ category: '', description: '', amount: '' });
      loadExpenseData();
    } catch (error: any) {
      toast.error('Failed to log expense', {
        description: error.message || 'Server error occurred.'
      });
    }
  };

  const totalBudget = Object.values(budgetsByCategory).reduce((sum, cat) => sum + cat.limit, 0);
  const totalSpent = Object.values(budgetsByCategory).reduce((sum, cat) => sum + cat.spent, 0);
  const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (loading && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#EF4444]" />
        <p className="text-muted-foreground font-['Inter']">Loading expense records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Space_Grotesk'] text-3xl mb-2">Expense Logger</h1>
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
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="capitalize">{c.name}</SelectItem>
                  ))}
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
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-3 rounded-[20px] transition-all dark:bg-white/5 dark:hover:bg-white/10 bg-gray-50 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-['Inter']">{expense.description}</p>
                <p className="text-xs text-muted-foreground font-['Inter'] capitalize">
                  {expense.expense_type} • {new Date(expense.date).toLocaleDateString()}
                </p>
              </div>
              <span className="text-lg font-['Space_Grotesk'] text-[#EF4444]">
                -${expense.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {expenses.length === 0 && (
            <p className="text-center py-4 text-muted-foreground font-['Inter']">No expenses logged yet</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
