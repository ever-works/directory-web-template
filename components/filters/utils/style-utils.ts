import { cn } from "@heroui/react";

/**
 * Common button styles for filter components
 */
export const buttonStyles = {
  base: "font-medium transition-[color,box-shadow,border-color] duration-300",
  active: "bg-theme-primary-500 text-white border-theme-primary-500 shadow-xs",
  inactive: "border border-dark--theme-200 dark:border-dark--theme-800",
  hover: "hover:shadow-md hover:border-theme-primary-200 dark:hover:border-theme-primary-800",
  disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
} as const;

/**
 * Common container styles for filter components
 */
export const containerStyles = {
  base: "bg-white/90 dark:bg-gray-900/90 rounded-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-xs dark:shadow-lg transition-colors duration-300",
  header: "p-4 border-b border-gray-200/50 dark:border-gray-700/50",
  content: "p-2",
} as const;

/**
 * Common text styles for filter components
 */
export const textStyles = {
  title: "text-lg font-semibold text-gray-900 dark:text-gray-200 transition-colors duration-300",
  subtitle: "text-sm text-gray-600 dark:text-gray-400",
  label: "text-xs text-gray-500 dark:text-gray-400",
} as const;

/**
 * Common filter item styles for active filters
 */
export const filterItemStyles = {
  base: "inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border",
  primary: "bg-theme-primary-100 dark:bg-gray-800 text-theme-primary-700 dark:text-theme-primary-400 border-theme-primary-200 dark:border-gray-700",
  blue: "bg-blue-100 dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-gray-700",
  green: "bg-green-100 dark:bg-gray-800 text-green-700 dark:text-green-400 border-green-200 dark:border-gray-700",
  removeButton: {
    primary: "ml-2 text-theme-primary-600/70 dark:text-theme-primary-400/70 hover:text-theme-primary-800 dark:hover:text-theme-primary-300",
    blue: "ml-2 text-blue-600/70 dark:text-blue-400/70 hover:text-blue-800 dark:hover:text-blue-300",
    green: "ml-2 text-green-600/70 dark:text-green-400/70 hover:text-green-800 dark:hover:text-green-300",
  },
} as const;

/**
 * Get button variant styles based on active state
 */
export function getButtonVariantStyles(isActive: boolean, additionalClasses?: string) {
  return cn(
    buttonStyles.base,
    isActive ? buttonStyles.active : buttonStyles.inactive,
    buttonStyles.hover,
    additionalClasses
  );
}

/**
 * Get container styles with optional sticky behavior
 */
export function getContainerStyles(isSticky?: boolean, additionalClasses?: string) {
  return cn(
    containerStyles.base,
    isSticky && "bg-white/95 dark:bg-gray-800/95 shadow-md backdrop-blur-xs",
    additionalClasses
  );
} 