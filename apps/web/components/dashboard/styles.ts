// Dashboard shared style constants
// Centralized design system for dashboard chart components

export const CARD_BASE_STYLES =
    "bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6";

export const TITLE_STYLES = "text-lg font-semibold text-gray-900 dark:text-gray-100";

export const SUBTITLE_STYLES = "text-sm text-gray-500 dark:text-gray-400";

export const VALUE_STYLES = "text-2xl font-bold text-gray-900 dark:text-gray-100";

export const METRIC_CARD_STYLES = "flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg";

export const METRIC_LABEL_STYLES = "text-sm font-medium text-gray-600 dark:text-gray-400";

export const METRIC_VALUE_STYLES = "text-2xl font-bold text-gray-900 dark:text-gray-100";

export const METRIC_COMPARE_STYLES = "text-sm text-gray-500 dark:text-gray-400";

export const TOOLTIP_STYLES = {
    backgroundColor: "#1F2937",
    border: "1px solid #374151",
    borderRadius: "8px",
    color: "#F9FAFB",
} as const;

export const CHART_COLORS = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#EC4899", // Pink
    "#84CC16", // Lime
    "#F97316", // Orange
    "#6366F1", // Indigo
] as const;

// Semantic color mapping
export const SEMANTIC_COLORS = {
    votes: "#10B981",
    comments: "#F59E0B",
    submissions: "#3B82F6",
    views: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    primary: "#3B82F6",
} as const;
