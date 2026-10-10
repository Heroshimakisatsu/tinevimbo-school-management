import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  DollarSign, 
  Receipt, 
  Settings,
  Package,
  ShoppingBag
} from 'lucide-react';
import { cn } from './ui/utils';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  expenseAlert?: boolean;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'intake', icon: UserPlus },
  { id: 'tracer', icon: Users },
  { id: 'finance', icon: DollarSign },
  { id: 'expenses', icon: Receipt },
  { id: 'inventory', icon: Package },
  { id: 'uniform-inventory', icon: ShoppingBag },
  { id: 'management', icon: Settings },
];

export function BottomNav({ currentPage, onNavigate, expenseAlert }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden dark:bg-background/95 dark:border-t dark:border-white/10 bg-white/95 border-t border-gray-200 backdrop-blur-md">
      <div className="flex justify-around items-center px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const showAlert = item.id === 'expenses' && expenseAlert;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-[20px] transition-all duration-200 relative',
                isActive
                  ? 'text-[#10B981]'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-6 h-6" />
              {showAlert && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
