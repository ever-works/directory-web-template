import React, { ReactNode, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// Design system constants for touch interactions
const TOUCH_TARGET_SIZE = "min-h-[44px] min-w-[44px]";
const TOUCH_FEEDBACK_STYLES = "active:scale-95 transition-transform duration-150";
const SWIPE_THRESHOLD = 50;

// Touch-friendly button with proper sizing and feedback
interface AdminTouchButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function AdminTouchButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '' 
}: AdminTouchButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800";
      case 'secondary':
        return "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600";
      case 'ghost':
        return "text-gray-600 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800";
      case 'danger':
        return "bg-red-600 text-white hover:bg-red-700 active:bg-red-800";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return "px-3 py-2 text-sm";
      case 'lg':
        return "px-6 py-4 text-base";
      default:
        return "px-4 py-3 text-sm";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        TOUCH_TARGET_SIZE,
        TOUCH_FEEDBACK_STYLES,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth ? "w-full" : "",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        className
      )}
    >
      {children}
    </button>
  );
}

// Swipeable card component for mobile interactions
interface AdminSwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function AdminSwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  className = '' 
}: AdminSwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      setCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    const deltaX = currentX - startX;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    setIsDragging(false);
    setStartX(0);
    setCurrentX(0);
  };

  const transform = isDragging ? `translateX(${currentX - startX}px)` : '';

  return (
    <div
      ref={cardRef}
      className={cn(
        "touch-pan-y select-none",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform }}
    >
      {children}
    </div>
  );
}

// Pull-to-refresh container for mobile
interface AdminPullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function AdminPullToRefresh({ 
  children, 
  onRefresh,
  className = '' 
}: AdminPullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;

    if (deltaY > 0 && containerRef.current?.scrollTop === 0) {
      const pullDistance = Math.min(deltaY * 0.5, 100);
      setPullDistance(pullDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;

    if (pullDistance > 50) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    isPulling.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-auto touch-pan-y",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center py-4 text-gray-500 dark:text-gray-400"
          style={{ height: pullDistance }}
        >
          {isRefreshing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          ) : (
            <span className="text-sm">Pull to refresh</span>
          )}
        </div>
      )}
      
      {children}
    </div>
  );
}

// Mobile-optimized list with touch interactions
interface AdminTouchListProps {
  children: ReactNode;
  onItemPress?: (index: number) => void;
  className?: string;
}

export function AdminTouchList({ 
  children, 
  onItemPress,
  className = '' 
}: AdminTouchListProps) {
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const handleItemPress = (index: number) => {
    setPressedIndex(index);
    setTimeout(() => setPressedIndex(null), 150);
    
    if (onItemPress) {
      onItemPress(index);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          onClick={() => handleItemPress(index)}
          className={cn(
            "cursor-pointer transition-all duration-150",
            pressedIndex === index ? "scale-95 opacity-80" : "",
            "active:scale-95 active:opacity-80"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// Mobile-optimized grid with touch-friendly spacing
interface AdminTouchGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AdminTouchGrid({ 
  children, 
  cols = 2,
  gap = 'md',
  className = '' 
}: AdminTouchGridProps) {
  const getGridStyles = () => {
    if (cols === 2) return "grid grid-cols-2";
    if (cols === 3) return "grid grid-cols-3";
    return "grid grid-cols-4";
  };

  const getGapStyles = () => {
    if (gap === 'sm') return "gap-2";
    if (gap === 'lg') return "gap-4";
    return "gap-3";
  };

  return (
    <div className={cn(
      getGridStyles(),
      getGapStyles(),
      "touch-pan-y",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-optimized search input with touch-friendly design
interface AdminTouchSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function AdminTouchSearch({ 
  value, 
  onChange, 
  placeholder = "Search...",
  loading = false,
  className = '' 
}: AdminTouchSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-busy={loading}
        className={cn(
          "w-full px-4 py-3 text-base",
          "border border-gray-300 dark:border-gray-600 rounded-lg",
          "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          "focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "placeholder-gray-500 dark:placeholder-gray-400",
          TOUCH_TARGET_SIZE
        )}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
