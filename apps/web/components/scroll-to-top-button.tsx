"use client";

import { useState, useEffect } from "react";
import { ChevronUp, ArrowUp } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { cn } from "@/lib/utils";

interface ScrollToTopButtonProps {
  showAfter?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "elegant" | "minimal" | "gradient";
  easing?: 'linear' | 'easeInOut' | 'easeOut' | 'easeIn' | 'bounceOut';
}

export function ScrollToTopButton({ 
  showAfter = 300, 
  className,
  size = "md",
  variant = "elegant",
  easing = "easeInOut"
}: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { scrollToTop } = useScrollToTop({ 
    behavior: 'smooth',
    easing,
    duration: 800
  });

  useEffect(() => {
    const toggleVisibility = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      
      setScrollProgress(progress);
      setIsVisible(scrolled > showAfter);
    };

    const throttledToggleVisibility = throttle(toggleVisibility, 16); // ~60fps
    window.addEventListener('scroll', throttledToggleVisibility);
    return () => window.removeEventListener('scroll', throttledToggleVisibility);
  }, [showAfter]);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-7 h-7"
  };

  const variants = {
    default: "bg-primary-600 hover:bg-primary-700 text-white border-2 border-primary-500 hover:border-primary-600",
    elegant: "bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg text-gray-800 dark:text-white border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 shadow-lg hover:shadow-xl",
    minimal: "bg-gray-800/80 dark:bg-white/80 text-white dark:text-gray-800 backdrop-blur-md hover:bg-gray-900 dark:hover:bg-white",
    gradient: "bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-2 border-white/20 hover:shadow-2xl hover:shadow-purple-500/25"
  };

  const handleClick = () => {
    // Add a subtle haptic feedback effect (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    scrollToTop();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Progress ring for elegant variant */}
      {variant === "elegant" && (
        <div className="absolute inset-0 rounded-full">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="2"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="stroke-primary-500 dark:stroke-primary-400 transition-all duration-300"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${scrollProgress * 100}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      )}
      
      <button
       
       onClick={handleClick}
       onKeyDown={(e) => {
         if (e.key === 'Enter' || e.key === ' ') {
           e.preventDefault();
           handleClick();
         }
       }}
       className={cn(
         "relative rounded-full transition-all duration-500 ease-out",
         "flex items-center justify-center",
         "hover:scale-110 active:scale-95",
         "animate-fadeInUp",
         "group",
         sizeClasses[size],
         variants[variant],
         className
       )}
       aria-label="Scroll to top"
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 rounded-full bg-linear-to-r from-primary-400/20 to-primary-600/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        
        {/* Icon with rotation animation */}
        <div className="relative overflow-hidden">
          {variant === "gradient" ? (
            <ArrowUp className={cn(
              iconSizes[size], 
              "transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
            )} />
          ) : (
            <ChevronUp className={cn(
              iconSizes[size], 
              "transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110"
            )} />
          )}
          
          {/* Sparkle effect for gradient variant */}
          {variant === "gradient" && (
            <>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" />
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping" style={{ animationDelay: '0.2s' }} />
            </>
          )}
        </div>

        {/* Ripple effect on click */}
        <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:scale-110 transition-transform duration-200" />
      </button>
      
      {/* Floating text hint */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg">
          Back to top
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
        </div>
      </div>
    </div>
  );
}

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
} 