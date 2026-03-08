"use client";

import React from 'react';
import { cn } from '@heroui/react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = 'lg',
  padding = 'md',
  center = true,
}: ResponsiveContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 py-2',
    md: 'px-6 py-4',
    lg: 'px-8 py-6',
    xl: 'px-12 py-8',
  };

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        center && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

// Hook to detect screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile');
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}

// Component to show/hide based on screen size
interface ResponsiveShowProps {
  children: React.ReactNode;
  on?: ('mobile' | 'tablet' | 'desktop')[];
  className?: string;
}

export function ResponsiveShow({ children, on = ['desktop'], className }: ResponsiveShowProps) {
  const screenSize = useScreenSize();
  
  if (!on.includes(screenSize)) {
    return null;
  }

  return <div className={className}>{children}</div>;
}

// Component to hide based on screen size
interface ResponsiveHideProps {
  children: React.ReactNode;
  on?: ('mobile' | 'tablet' | 'desktop')[];
  className?: string;
}

export function ResponsiveHide({ children, on = ['mobile'], className }: ResponsiveHideProps) {
  const screenSize = useScreenSize();
  
  if (on.includes(screenSize)) {
    return null;
  }

  return <div className={className}>{children}</div>;
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className,
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const getGridCols = () => {
    const { mobile = 1, tablet = 2, desktop = 3 } = cols;
    return cn(
      `grid-cols-${mobile}`,
      `md:grid-cols-${tablet}`,
      `lg:grid-cols-${desktop}`
    );
  };

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// Component for custom breakpoints
interface BreakpointProps {
  children: React.ReactNode;
  at: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  direction?: 'up' | 'down' | 'only';
  className?: string;
}

export function Breakpoint({ children, at, direction = 'up', className }: BreakpointProps) {
  const getBreakpointClass = () => {
    switch (direction) {
      case 'up':
        return `${at}:block`;
      case 'down':
        return `max-${at}:block`;
      case 'only':
        return `${at}:block max-${at}:hidden`;
      default:
        return `${at}:block`;
    }
  };

  return (
    <div className={cn('hidden', getBreakpointClass(), className)}>
      {children}
    </div>
  );
}

// Component for responsive spacing
interface ResponsiveSpacingProps {
  children: React.ReactNode;
  spacing?: {
    mobile?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    tablet?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    desktop?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  type?: 'padding' | 'margin';
  className?: string;
}

export function ResponsiveSpacing({
  children,
  spacing = { mobile: 'sm', tablet: 'md', desktop: 'lg' },
  type = 'padding',
  className,
}: ResponsiveSpacingProps) {
  const spacingMap = {
    xs: type === 'padding' ? 'p-2' : 'm-2',
    sm: type === 'padding' ? 'p-4' : 'm-4',
    md: type === 'padding' ? 'p-6' : 'm-6',
    lg: type === 'padding' ? 'p-8' : 'm-8',
    xl: type === 'padding' ? 'p-12' : 'm-12',
  };

  const getSpacingClasses = () => {
    const { mobile = 'sm', tablet = 'md', desktop = 'lg' } = spacing;
    return cn(
      spacingMap[mobile],
      `md:${spacingMap[tablet].replace(type === 'padding' ? 'p-' : 'm-', type === 'padding' ? 'p-' : 'm-')}`,
      `lg:${spacingMap[desktop].replace(type === 'padding' ? 'p-' : 'm-', type === 'padding' ? 'p-' : 'm-')}`
    );
  };

  return (
    <div className={cn(getSpacingClasses(), className)}>
      {children}
    </div>
  );
}
