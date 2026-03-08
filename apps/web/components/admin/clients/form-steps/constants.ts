// Input styling classes (DRY - reused across all form fields)
export const inputBaseClasses =
  "w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

export const inputErrorClasses =
  "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700";

export const inputNormalClasses =
  "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

// Semantic styling classes for form elements
export const STYLE_CLASSES = {
  fieldContainer: "space-y-2",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300",
  required: "text-red-500",
  error: "text-sm text-red-600 dark:text-red-400",
  helpText: "text-xs text-gray-500 dark:text-gray-400",
  stepContainer: "space-y-6",
  gridTwoCol: "grid grid-cols-1 md:grid-cols-2 gap-4",
} as const;
