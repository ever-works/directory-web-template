"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface ToggleOption {
  value: string;
  label: string;
  badge?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'modern' | 'pills';
}

export function ToggleGroup({
  options,
  value,
  onValueChange,
  className,
  size = 'md',
  variant = 'modern'
}: ToggleGroupProps) {
  const selectedIndex = options.findIndex(option => option.value === value);

  const sizeClasses = {
    sm: {
      container: 'p-0.5',
      button: 'px-2.5 py-1 text-xs',
      badge: 'px-1.5 py-0.5 text-xs'
    },
    md: {
      container: 'p-1',
      button: 'px-4 py-2 text-sm',
      badge: 'px-2 py-0.5 text-xs'
    },
    lg: {
      container: 'p-1.5',
      button: 'px-6 py-2.5 text-base',
      badge: 'px-2.5 py-1 text-sm'
    }
  };

  const variantClasses = {
    default: {
      container: 'bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
      button: 'rounded-md cursor-pointer',
      activeButton: 'text-gray-900 dark:text-white',
      inactiveButton: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
      slider: 'bg-white dark:bg-gray-700 rounded-md shadow-xs border border-gray-200/50 dark:border-gray-600/50'
    },
    modern: {
      container: 'bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-xs backdrop-blur-xs',
      button: 'rounded-lg cursor-pointer',
      activeButton: 'text-slate-900 dark:text-white shadow-xs',
      inactiveButton: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/30',
      slider: 'bg-white dark:bg-slate-700 rounded-lg shadow-md border border-slate-200/50 dark:border-slate-600/50 backdrop-blur-xs'
    },
    pills: {
      container: 'bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/30 shadow-inner',
      button: 'rounded-xl cursor-pointer',
      activeButton: 'text-white shadow-lg',
      inactiveButton: 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50',
      slider: 'bg-linear-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg'
    }
  };

  const currentSize = sizeClasses[size];
  const currentVariant = variantClasses[variant];

  return (
    <div className={cn("relative inline-flex items-center", currentVariant.container, currentSize.container, className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !option.disabled && onValueChange(option.value)}
          disabled={option.disabled}
          className={cn(
            'relative font-semibold transition-all h-10 rounded-lg duration-300 z-10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
            currentVariant.button,
            currentSize.button,
            value === option.value
              ? currentVariant.activeButton
              : currentVariant.inactiveButton
          )}
          style={{ minWidth: `${100 / options.length}%` }}
        >
          {option.icon && (
            <span className="shrink-0">
              {option.icon}
            </span>
          )}
          <span className="whitespace-nowrap">{option.label}</span>
          {option.badge && (
            <span className={cn(
              'font-bold bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-xs',
              currentSize.badge
            )}>
              {option.badge}
            </span>
          )}
        </button>
      ))}
      
      {/* Enhanced sliding background */}
      <div
        className={cn(
          'absolute transition-all duration-300 ease-out',
          currentVariant.slider,
          size === 'sm' ? 'top-0.5 h-[calc(100%-4px)]' : 
          size === 'md' ? 'top-1 h-[calc(100%-8px)]' : 
          'top-1.5 h-[calc(100%-12px)]'
        )}
        style={{
          left: `calc(${(selectedIndex * 100) / options.length}% + ${size === 'sm' ? '2px' : size === 'md' ? '4px' : '6px'})`,
          width: `calc(${100 / options.length}% - ${size === 'sm' ? '4px' : size === 'md' ? '8px' : '12px'})`
        }}
      />
    </div>
  );
}

// Preset components for common use cases
export function BillingToggle({
  value,
  onValueChange,
  monthlyLabel = "Monthly",
  yearlyLabel = "Yearly",
  saveLabel = "Save 20%",
  className
}: {
  value: 'monthly' | 'yearly';
  onValueChange: (value: 'monthly' | 'yearly') => void;
  monthlyLabel?: string;
  yearlyLabel?: string;
  saveLabel?: string;
  className?: string;
}) {
  const options: ToggleOption[] = [
    {
      value: 'monthly',
      label: monthlyLabel
    },
    {
      value: 'yearly',
      label: yearlyLabel,
      badge: saveLabel
    }
  ];

  return (
    <ToggleGroup
      options={options}
      value={value}
      onValueChange={onValueChange as (value: string) => void}
      variant="modern"
      className={className}
    />
  );
}

// Demo component
export function ToggleGroupDemo() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [viewMode, setViewMode] = useState('grid');
  const [theme, setTheme] = useState('light');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-20 px-4">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Enhanced Toggle Groups
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Modern, accessible toggle components with smooth animations
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Billing Interval (Preset)
          </h2>
          <div className="flex justify-center">
            <BillingToggle
              value={billingInterval}
              onValueChange={setBillingInterval}
            />
          </div>
        </div>

        {/* Modern Variant */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Modern Variant
          </h2>
          <div className="flex justify-center">
            <ToggleGroup
              options={[
                { value: 'grid', label: 'Grid View' },
                { value: 'list', label: 'List View' },
                { value: 'card', label: 'Card View' }
              ]}
              value={viewMode}
              onValueChange={setViewMode}
              variant="modern"
            />
          </div>
        </div>

        {/* Pills Variant */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Pills Variant
          </h2>
          <div className="flex justify-center">
            <ToggleGroup
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
              ]}
              value={theme}
              onValueChange={setTheme}
              variant="pills"
              size="lg"
            />
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Current Values
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-600 dark:text-slate-400">
              Billing: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-sm">{billingInterval}</code>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              View Mode: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-sm">{viewMode}</code>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              Theme: <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-sm">{theme}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
