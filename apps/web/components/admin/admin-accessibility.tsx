import { forwardRef, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Design system constants for accessibility
const SKIP_LINK_STYLES = "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-sm focus:shadow-lg";
const FOCUS_RING_STYLES = "focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900";
const LANDMARK_STYLES = "scroll-mt-16";

// Skip link component for keyboard navigation
export function AdminSkipLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} className={SKIP_LINK_STYLES}>
      {children}
    </a>
  );
}

// Accessible landmark wrapper
interface AdminLandmarkProps extends HTMLAttributes<HTMLElement> {
  as?: 'main' | 'section' | 'nav' | 'aside' | 'header' | 'footer';
  label?: string;
  describedBy?: string;
}

export const AdminLandmark = forwardRef<HTMLElement, AdminLandmarkProps>(
  ({ as: Component = 'section', label, describedBy, className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        aria-label={label}
        aria-describedby={describedBy}
        className={cn(LANDMARK_STYLES, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

AdminLandmark.displayName = 'AdminLandmark';

// Accessible heading with proper hierarchy
interface AdminHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  screenReaderOnly?: boolean;
}

export const AdminHeading = forwardRef<HTMLHeadingElement, AdminHeadingProps>(
  ({ level, visualLevel, screenReaderOnly = false, className, children, ...props }, ref) => {
    const Component = `h${level}` as const;
    const visualClass = visualLevel ? getHeadingVisualClass(visualLevel) : getHeadingVisualClass(level);
    const srOnlyClass = screenReaderOnly ? "sr-only" : "";
    
    return (
      <Component
        ref={ref}
        className={cn(visualClass, srOnlyClass, className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

AdminHeading.displayName = 'AdminHeading';

// Visual heading classes following design system
function getHeadingVisualClass(level: number): string {
  const headingClasses = {
    1: "text-4xl font-bold text-gray-900 dark:text-white",
    2: "text-3xl font-semibold text-gray-900 dark:text-white",
    3: "text-2xl font-semibold text-gray-900 dark:text-white",
    4: "text-xl font-semibold text-gray-900 dark:text-white",
    5: "text-lg font-medium text-gray-900 dark:text-white",
    6: "text-base font-medium text-gray-900 dark:text-white"
  };
  return headingClasses[level as keyof typeof headingClasses] || headingClasses[3];
}

// Accessible status announcer for screen readers
export function AdminStatusAnnouncer({ 
  message, 
  priority = 'polite' 
}: { 
  message: string; 
  priority?: 'polite' | 'assertive';
}) {
  return (
    <output aria-live={priority} aria-atomic="true" className="sr-only">
      {message}
    </output>
  );
}

// Focus trap utilities
export function AdminFocusTrap({ 
  children, 
  active = true,
  className 
}: { 
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      tabIndex={-1}
      className={cn("focus-within:ring-1 focus-within:ring-blue-500", className)}
      onKeyDown={(e) => {
        if (!active) return;
        
        if (e.key === 'Tab') {
          // Basic focus trap implementation
          const focusableElements = e.currentTarget.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
        
        if (e.key === 'Escape') {
          // Allow escape key to break focus trap
          const firstFocusable = e.currentTarget.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          firstFocusable?.blur();
        }
      }}
    >
      {children}
    </div>
  );
}

// Accessible button with proper focus styles
interface AdminAccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const AdminAccessibleButton = forwardRef<HTMLButtonElement, AdminAccessibleButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false,
    type = 'button',
    className, 
    children, 
    ...props 
  }, ref) => {
    const t = useTranslations('admin.ACCESSIBILITY');
    const baseStyles = cn(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors",
      FOCUS_RING_STYLES,
      "disabled:pointer-events-none disabled:opacity-50"
    );
    
    const variantStyles = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
      ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    };
    
    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };
    
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-describedby={loading ? t('LOADING_STATUS') : undefined}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading && (
          <>
            <span className="sr-only" id={t('LOADING_STATUS')}>{t('LOADING')}</span>
            <svg 
              className="animate-spin -ml-1 mr-2 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </>
        )}
        {children}
      </button>
    );
  }
);

AdminAccessibleButton.displayName = 'AdminAccessibleButton';
