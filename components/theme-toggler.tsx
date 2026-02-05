"use client";

import { ChevronDown, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

interface ThemeTogglerProps {
  compact?: boolean;
  /** Open dropdown upward instead of downward (useful for footer) */
  openUp?: boolean;
  /** Show only icon without text or dropdown (useful for header in non-demo mode) */
  iconOnly?: boolean;
}

export function ThemeToggler({ compact = false, openUp = false, iconOnly = false }: ThemeTogglerProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const t = useTranslations("common");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle outside click and Escape key to close popover
  useEffect(() => {
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      // Defer to next tick to avoid closing from the opening event
      const timeoutId = setTimeout(() => {
        document.addEventListener('pointerdown', handlePointerDownOutside, { capture: true });
        document.addEventListener('keydown', handleKeyDown);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('pointerdown', handlePointerDownOutside, { capture: true } as any);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  if (!mounted) {
    return null;
  }

  const showTooltip = (btn: HTMLButtonElement) => {
    const r = btn.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
    setHovered(true);
  };

  const hideTooltip = () => setHovered(false);

  if (iconOnly) {
    const tooltipText = theme === "dark" ? t("SWITCH_TO_LIGHT") : t("SWITCH_TO_DARK");

    return (
      <>
        <button
          onClick={() => {
            hideTooltip();
            setTheme(theme === "dark" ? "light" : "dark");
          }}
          onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
          onMouseLeave={hideTooltip}
          onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
          onBlur={hideTooltip}
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
          ) : (
            <Moon className="h-5 w-5 text-theme-primary" />
          )}
        </button>
        {hovered && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
            style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
          >
            {tooltipText}
          </div>, document.body)
        }
      </>
    );
  }

  if (compact) {
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="relative inline-flex items-center h-10 w-20 rounded-full transition-colors duration-300 bg-gray-300 data-checked:bg-theme-primary"
        data-checked={theme === "dark" ? "" : undefined}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        <span
          className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
            theme === "dark" ? "translate-x-11" : "translate-x-1"
          }`}
        >
          <span className="flex items-center justify-center h-full w-full">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-theme-primary" />
            ) : (
              <Sun className="h-5 w-5 text-theme-primary" />
            )}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          hideTooltip();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
        onMouseLeave={hideTooltip}
        onFocus={(e) => showTooltip(e.currentTarget as HTMLButtonElement)}
        onBlur={hideTooltip}
        className="relative inline-flex items-center cursor-pointer justify-center h-9 w-6 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300"
        aria-label={`Current theme: ${theme || "loading"}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
      >
        {theme === "light" ? (
          <Sun className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-theme-primary" />
        )}
      </button>

      {hovered && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
        >
          {theme === "light" ? "Light" : "Dark"}
        </div>, document.body)
      }

      {isOpen && (
        <div
          id={panelId}
          className={`absolute right-0 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 rounded-xl shadow-xl z-50 ${
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                theme === "light"
                  ? "bg-yellow-100 dark:bg-yellow-600/80 text-yellow-800 dark:text-white shadow-md"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
              } hover:scale-[1.02]`}
              onClick={() => handleThemeChange("light")}
            >
              <Sun className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
              <span className="font-medium">Light</span>
              {theme === "light" && (
                <div className="ml-auto w-2 h-2 bg-yellow-600 dark:bg-white rounded-full"></div>
              )}
            </button>

            <button
              type="button"
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                theme === "dark"
                  ? "bg-theme-primary-100 dark:bg-theme-primary text-theme-primary-800 dark:text-white shadow-md"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
              } hover:scale-[1.02]`}
              onClick={() => handleThemeChange("dark")}
            >
              <Moon className="h-4 w-4 text-theme-primary dark:text-white" />
              <span className="font-medium text-theme-primary dark:text-white">Dark</span>
              {theme === "dark" && (
                <div className="ml-auto w-2 h-2 bg-theme-primary-800 dark:bg-white rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
