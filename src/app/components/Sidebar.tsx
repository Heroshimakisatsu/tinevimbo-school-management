import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  DollarSign, 
  Receipt, 
  Settings,
  Package,
  ShoppingBag,
  Sun,
  Moon
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from './ui/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  expenseAlert?: boolean;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'intake', label: 'Intake', icon: UserPlus },
  { id: 'tracer', label: 'Tracer', icon: Users },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'uniform-inventory', label: 'Uniforms', icon: ShoppingBag },
  { id: 'management', label: 'Management', icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, theme, onThemeToggle, expenseAlert }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 p-4 hidden md:block dark:border-r-0 border-r border-gray-200 dark:bg-transparent bg-gray-100">
      <GlassCard className="h-full flex flex-col" isSidebar>
        {/* Logo/Header */}
        <div className="mb-8">
          <h1 className="font-['Space_Grotesk'] text-2xl text-[#10B981] mb-1">Tinevimbo</h1>
          <p className="text-sm text-muted-foreground font-['Inter']">School ERP System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const showAlert = item.id === 'expenses' && expenseAlert;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-[20px] transition-all duration-200 font-["Inter"] relative',
                  isActive
                    ? 'bg-[#10B981] text-white'
                    : 'text-foreground dark:hover:bg-white/10 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {showAlert && (
                  <div className="absolute right-3 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className="flex items-center gap-3 px-4 py-3 rounded-[20px] dark:hover:bg-white/10 hover:bg-gray-100 transition-all duration-200 mt-4"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5 text-[#F59E0B]" />
              <span className="font-['Inter']">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 text-[#3B82F6]" />
              <span className="font-['Inter']">Dark Mode</span>
            </>
          )}
        </button>
      </GlassCard>
    </div>
  );
}
