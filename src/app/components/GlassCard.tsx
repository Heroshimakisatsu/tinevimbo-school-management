import React from 'react';
import { cn } from './ui/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  isSidebar?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function GlassCard({ children, className, hover = false, isSidebar = false, onClick }: GlassCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.target as HTMLDivElement).click();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'backdrop-blur-md rounded-[20px] p-6 w-full max-w-[95%] mx-auto',
        // Dark mode styling
        'dark:bg-white/5 dark:border dark:border-white/10',
        // Light mode styling
        isSidebar
          ? 'bg-white border border-gray-300'
          : 'bg-white border border-gray-200 shadow-sm',
        hover && 'transition-all duration-300 dark:hover:bg-white/10 dark:hover:border-white/20 hover:shadow-md hover:border-gray-300',
        className
      )}
    >
      {children}
    </div>
  );
}
