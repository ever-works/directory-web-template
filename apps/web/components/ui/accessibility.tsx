"use client";

import React from 'react';
import { cn } from '@heroui/react';

// Component for screen readers only
interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  className?: string;
}

export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
        className
      )}
    >
      {children}
    </span>
  );
}

// Composant pour les liens de navigation rapide
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'bg-theme-primary text-white px-4 py-2 rounded-md font-medium',
        'focus:z-50 focus:outline-hidden focus:ring-2 focus:ring-theme-primary/50',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

// Component for screen reader announcements
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  className?: string;
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// Hook pour la gestion du focus
export function useFocusManagement() {
  const focusRef = React.useRef<HTMLElement>(null);

  const setFocus = React.useCallback(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const trapFocus = React.useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = focusRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }, []);

  return { focusRef, setFocus, trapFocus };
}

// Composant pour les messages d'erreur accessibles
interface AccessibleErrorProps {
  id: string;
  error?: string;
  className?: string;
}

export function AccessibleError({ id, error, className }: AccessibleErrorProps) {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        'text-red-600 dark:text-red-400 text-sm mt-1',
        'flex items-start space-x-2',
        className
      )}
    >
      <svg
        className="w-4 h-4 mt-0.5 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{error}</span>
    </div>
  );
}

// Composant pour les champs de formulaire accessibles
interface AccessibleFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleField({
  id,
  label,
  error,
  required = false,
  description,
  children,
  className,
}: AccessibleFieldProps) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="requis">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      
      <div className="relative">
        {React.isValidElement(children) && React.cloneElement(children, {
          id,
          'aria-describedby': [
            description ? descriptionId : '',
            error ? errorId : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
          'aria-invalid': error ? 'true' : undefined,
          'aria-required': required,
        } as any)}
      </div>
      
      <AccessibleError id={errorId} error={error} />
    </div>
  );
}

// Composant pour les boutons accessibles
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function AccessibleButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText = 'Chargement...',
  children,
  className,
  disabled,
  ...props
}: AccessibleButtonProps) {
  const variantClasses = {
    primary: 'bg-theme-primary hover:bg-theme-primary/90 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'font-medium rounded-lg transition-all duration-200',
        'focus:outline-hidden focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        loading && 'cursor-wait',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center space-x-2">
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
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// Hook pour les raccourcis clavier
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifiers = {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      };

      Object.entries(shortcuts).forEach(([shortcut, callback]) => {
        const parts = shortcut.toLowerCase().split('+');
        const targetKey = parts[parts.length - 1];
        const requiredModifiers = parts.slice(0, -1);

        if (key === targetKey) {
          const modifierMatch = requiredModifiers.every(mod => {
            switch (mod) {
              case 'ctrl':
                return modifiers.ctrl;
              case 'alt':
                return modifiers.alt;
              case 'shift':
                return modifiers.shift;
              case 'meta':
                return modifiers.meta;
              default:
                return false;
            }
          });

          if (modifierMatch) {
            event.preventDefault();
            callback();
          }
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
