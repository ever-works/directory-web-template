import { ReactNode, useId, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Responsive grid container with automatic breakpoint handling
interface AdminResponsiveGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AdminResponsiveGrid({ 
  children, 
  cols = 4, 
  gap = 'md',
  className = '' 
}: AdminResponsiveGridProps) {
  const getGridStyles = () => {
    if (cols === 1) return "grid grid-cols-1";
    if (cols === 2) return "grid grid-cols-1 md:grid-cols-2";
    if (cols === 3) return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  };

  const getGapStyles = () => {
    if (gap === 'sm') return "gap-3 md:gap-4 lg:gap-6";
    if (gap === 'lg') return "gap-6 md:gap-8 lg:gap-10";
    return "gap-4 md:gap-6 lg:gap-8";
  };

  return (
    <div className={cn(getGridStyles(), getGapStyles(), className)}>
      {children}
    </div>
  );
}

// Responsive card container with adaptive padding and spacing
interface AdminResponsiveCardProps {
  children: ReactNode;
  variant?: 'compact' | 'comfortable' | 'spacious';
  className?: string;
}

export function AdminResponsiveCard({ 
  children, 
  variant = 'comfortable',
  className = '' 
}: AdminResponsiveCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return "p-3 md:p-4 lg:p-5";
      case 'spacious':
        return "p-6 md:p-8 lg:p-10";
      default:
        return "p-4 md:p-6 lg:p-8";
    }
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700",
      getVariantStyles(),
      className
    )}>
      {children}
    </div>
  );
}

// Responsive table that stacks on mobile
interface AdminResponsiveTableProps {
  headers: string[];
  children: ReactNode; // table rows (<tr>)
  mobileRows?: ReactNode; // mobile-friendly rows (cards/list items)
  className?: string;
}

export function AdminResponsiveTable({ 
  headers,
  children,
  mobileRows,
  className = ''
}: AdminResponsiveTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      {/* Desktop table */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((header, index) => (
              <th 
                key={index}
                className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>

      {/* Mobile cards */}
      {mobileRows && (
        <div className="md:hidden space-y-3" role="list">
          {mobileRows}
        </div>
      )}
    </div>
  );
}

// Responsive navigation with mobile hamburger menu
interface AdminResponsiveNavProps {
  children: ReactNode;
  title: string;
  className?: string;
}

export function AdminResponsiveNav({ 
  children, 
  title,
  className = '' 
}: AdminResponsiveNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <nav className={cn("relative", className)}>
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="p-2"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation content */}
      <div id={contentId} className={cn(
        "md:block",
        isOpen ? "block" : "hidden"
      )}>
        {children}
      </div>
    </nav>
  );
}

// Responsive text with adaptive sizing
interface AdminResponsiveTextProps {
  children: ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption';
  className?: string;
}

export function AdminResponsiveText({ 
  children, 
  variant = 'body',
  className = '' 
}: AdminResponsiveTextProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return "text-2xl md:text-3xl lg:text-4xl font-bold";
      case 'h2':
        return "text-xl md:text-2xl lg:text-3xl font-semibold";
      case 'h3':
        return "text-lg md:text-xl lg:text-2xl font-semibold";
      case 'h4':
        return "text-base md:text-lg lg:text-xl font-medium";
      case 'caption':
        return "text-xs md:text-sm";
      default:
        return "text-sm md:text-base";
    }
  };

  return (
    <div className={cn(
      "text-gray-900 dark:text-gray-100",
      getVariantStyles(),
      className
    )}>
      {children}
    </div>
  );
}

// Responsive spacing container
interface AdminResponsiveSpacingProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AdminResponsiveSpacing({ 
  children, 
  size = 'md',
  className = '' 
}: AdminResponsiveSpacingProps) {
  const getSpacingStyles = () => {
    switch (size) {
      case 'sm':
        return "space-y-2 md:space-y-3 lg:space-y-4";
      case 'lg':
        return "space-y-6 md:space-y-8 lg:space-y-10";
      case 'xl':
        return "space-y-8 md:space-y-10 lg:space-y-12";
      default:
        return "space-y-4 md:space-y-6 lg:space-y-8";
    }
  };

  return (
    <div className={cn(getSpacingStyles(), className)}>
      {children}
    </div>
  );
}

// Responsive button group for mobile-friendly actions
interface AdminResponsiveButtonGroupProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function AdminResponsiveButtonGroup({ 
  children, 
  orientation = 'horizontal',
  className = '' 
}: AdminResponsiveButtonGroupProps) {
  const getOrientationStyles = () => {
    if (orientation === 'vertical') {
      return "flex flex-col space-y-2 md:space-y-3";
    }
    return "flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3";
  };

  return (
    <div className={cn(getOrientationStyles(), className)}>
      {children}
    </div>
  );
}

// Responsive data display that adapts to screen size
interface AdminResponsiveDataDisplayProps {
  label: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  className?: string;
}

export function AdminResponsiveDataDisplay({ 
  label, 
  value, 
  format = 'text',
  className = '' 
}: AdminResponsiveDataDisplayProps) {
  const formatValue = () => {
    if (format === 'number' && typeof value === 'number') {
      return value.toLocaleString();
    }
    if (format === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    if (format === 'percentage' && typeof value === 'number') {
      return `${value}%`;
    }
    return value;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-0">
        {label}
      </div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {formatValue()}
      </div>
    </div>
  );
}

// Responsive chart container for mobile-optimized visualizations
interface AdminResponsiveChartProps {
  children: ReactNode;
  title: string;
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AdminResponsiveChart({ 
  children, 
  title,
  height = 'md',
  className = '' 
}: AdminResponsiveChartProps) {
  const getHeightStyles = () => {
    switch (height) {
      case 'sm':
        return "h-48 md:h-56 lg:h-64";
      case 'lg':
        return "h-64 md:h-72 lg:h-80";
      default:
        return "h-56 md:h-64 lg:h-72";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 mb-3 md:mb-4">
        {title}
      </h3>
      <div className={cn(
        "w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-3 md:p-4",
        getHeightStyles()
      )}>
        {children}
      </div>
    </div>
  );
}
