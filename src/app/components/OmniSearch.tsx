import { useEffect, useState } from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { mockStudents, mockTransactions } from '../data/mockData';

interface OmniSearchProps {
  onNavigate: (page: string, data?: any) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function OmniSearch({ onNavigate, theme, onThemeToggle }: OmniSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-2 rounded-[20px] backdrop-blur-md transition-all w-full max-w-md dark:bg-white/5 dark:border dark:border-white/10 dark:hover:bg-white/10 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
      >
        <Search className="w-5 h-5 text-muted-foreground" />
        <span className="text-muted-foreground font-['Inter'] flex-1 text-left">
          Search students, transactions...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-xs text-muted-foreground dark:border dark:border-white/20 dark:bg-white/10 border border-gray-300 bg-gray-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search anything..." className="font-['Inter']" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Students">
            {mockStudents.map((student) => (
              <CommandItem
                key={student.id}
                onSelect={() => {
                  onNavigate('tracer', student);
                  setOpen(false);
                }}
                className="font-['Inter']"
              >
                <span>{student.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {student.grade}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Recent Transactions">
            {mockTransactions.slice(0, 5).map((transaction) => (
              <CommandItem
                key={transaction.id}
                onSelect={() => {
                  onNavigate('finance', transaction);
                  setOpen(false);
                }}
                className="font-['Inter']"
              >
                <span>{transaction.studentName}</span>
                <span className="ml-2 text-xs text-[#10B981]">
                  ${transaction.amount}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => {
                onNavigate('intake');
                setOpen(false);
              }}
              className="font-['Inter']"
            >
              Add New Student
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onNavigate('finance');
                setOpen(false);
              }}
              className="font-['Inter']"
            >
              Record Payment
            </CommandItem>
            <CommandItem
              onSelect={() => {
                onThemeToggle();
                setOpen(false);
              }}
              className="font-['Inter']"
            >
              {theme === 'dark' ? (
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4" /> Switch to Light Mode
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Moon className="w-4 h-4" /> Switch to Dark Mode
                </span>
              )}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
