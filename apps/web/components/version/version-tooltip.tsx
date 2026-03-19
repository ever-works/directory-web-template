"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { VersionDisplay } from "./version-display";
import { useVersionInfo } from "@/hooks/use-version-info";

interface VersionTooltipProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  delay?: number;
}

export function VersionTooltip({
  children,
  className = "",
  disabled = false,
  delay = 300
}: VersionTooltipProps) {
  // Always call all hooks first - this is critical for hook order consistency
  const [isVisible, setIsVisible] = useState(false);
  const { versionInfo, error } = useVersionInfo();

  // Use refs to manage timeouts and prevent memory leaks
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Optimized show handler with delay
  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  // Optimized hide handler with immediate response
  const handleMouseLeave = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  // Handle tooltip hover to prevent hiding
  const handleTooltipMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Keyboard accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsVisible(false);
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Handle disabled state
  if (disabled) {
    return <>{children}</>;
  }

  // Handle error state - hide tooltip but preserve UI structure
  if (error || !versionInfo) {
    // For all users: return children without tooltip functionality
    // This preserves the UI structure (important for layout)
    return <>{children}</>;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        className="cursor-help transition-opacity duration-200"
        role="button"
        tabIndex={0}
        aria-label="Show version information"
        aria-describedby={isVisible ? "version-tooltip" : undefined}
      >
        {children}
      </div>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          id="version-tooltip"
          role="tooltip"
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50 animate-in fade-in-0 zoom-in-95 duration-200"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-72 max-w-80 backdrop-blur-xs">
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="w-3 h-3 bg-white dark:bg-gray-900 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                Data Repository Version
              </h3>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
              </div>
            </div>
            
            {/* Version Details */}
            <div className="space-y-2">
              <VersionDisplay 
                variant="detailed" 
                showDetails={true}
                className="border-0 shadow-none bg-transparent p-0"
              />
            </div>
            
            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Updates automatically</span>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 