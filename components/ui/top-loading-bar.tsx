'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TopLoadingBarProps {
  isLoading: boolean;
  className?: string;
}

/**
 * A thin loading bar that appears at the top of the viewport
 * Animates from 0% to 90% while loading, then completes to 100% when done
 */
export function TopLoadingBar({ isLoading, className }: TopLoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setProgress(0);

      // Quickly animate to 30%
      const timer1 = setTimeout(() => setProgress(30), 50);
      // Then gradually to 60%
      const timer2 = setTimeout(() => setProgress(60), 200);
      // Then slowly to 90%
      const timer3 = setTimeout(() => setProgress(90), 400);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (isVisible) {
      // Complete the progress bar
      setProgress(100);

      // Hide after animation completes
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);

      return () => clearTimeout(hideTimer);
    }
  }, [isLoading, isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-1 bg-transparent',
        className
      )}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-linear-to-r from-theme-primary via-theme-primary/80 to-theme-primary transition-[width] duration-300 ease-out shadow-lg"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(var(--theme-primary-rgb, 59, 130, 246), 0.5)',
        }}
      />
    </div>
  );
}
