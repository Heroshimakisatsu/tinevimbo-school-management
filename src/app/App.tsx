import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { OmniSearch } from './components/OmniSearch';
import { Dashboard } from './pages/Dashboard';
import { Intake } from './pages/Intake';
import { Finance } from './pages/Finance';
import { Expenses } from './pages/Expenses';
import { Tracer } from './pages/Tracer';
import { Management } from './pages/Management';
import { Inventory } from './pages/Inventory';
import { UniformInventory } from './pages/UniformInventory';
import { Sun, Moon } from 'lucide-react';
import { calculateStats } from './data/mockData';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Check if expenses exceed income for alert
  const stats = calculateStats();
  const expenseAlert = stats.totalExpenses > stats.totalRevenue * 0.8;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'intake':
        return <Intake />;
      case 'finance':
        return <Finance />;
      case 'expenses':
        return <Expenses />;
      case 'tracer':
        return <Tracer />;
      case 'management':
        return <Management />;
      case 'inventory':
        return <Inventory />;
      case 'uniform-inventory':
        return <UniformInventory />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen dark:bg-background bg-gray-50 font-['Inter']">
      {/* Desktop Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        theme={theme}
        onThemeToggle={toggleTheme}
        expenseAlert={expenseAlert}
      />

      {/* Main Content */}
      <div className="md:ml-64 min-h-screen pb-20 md:pb-0 dark:bg-transparent bg-gray-50">
        {/* Header with OmniSearch */}
        <div className="sticky top-0 z-10 backdrop-blur-md dark:bg-background/80 dark:border-b dark:border-white/10 bg-white/90 border-b border-gray-200 p-4">
          <div className="max-w-[95%] mx-auto flex items-center justify-between gap-4">
            <OmniSearch onNavigate={setCurrentPage} theme={theme} onThemeToggle={toggleTheme} />
            
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="md:hidden p-2 rounded-[20px] backdrop-blur-md dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-[#F59E0B]" />
              ) : (
                <Moon className="w-5 h-5 text-[#3B82F6]" />
              )}
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="max-w-[95%] mx-auto p-4 md:p-6">
          {renderPage()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        expenseAlert={expenseAlert}
      />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? 'rgba(11, 18, 33, 0.95)' : 'rgba(248, 250, 252, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            fontFamily: 'Inter',
          },
        }}
      />
    </div>
  );
}
