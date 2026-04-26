// Dashboard shared style constants
// Centralized design system - Vercel Analytics-inspired: clean, minimal, precise

import type React from "react";

export const CARD_BASE_STYLES =
    "bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8";

export const TITLE_STYLES = "text-sm font-semibold text-neutral-900 dark:text-white";

export const SUBTITLE_STYLES = "text-xs text-neutral-500 dark:text-neutral-400";

export const VALUE_STYLES = "text-xl font-semibold text-neutral-900 dark:text-white";

export const METRIC_CARD_STYLES =
    "flex flex-col gap-1.5 p-4 bg-neutral-50 dark:bg-white/[0.04] rounded-lg border border-neutral-100 dark:border-white/[0.05]";

export const METRIC_LABEL_STYLES = "text-xs font-medium text-neutral-500 dark:text-neutral-400";

export const METRIC_VALUE_STYLES = "text-xl font-semibold text-neutral-900 dark:text-white";

export const METRIC_COMPARE_STYLES = "text-xs text-neutral-500 dark:text-neutral-400";

export function getTooltipStyles(isDark: boolean): React.CSSProperties {
    return isDark
        ? {
              backgroundColor: "#141414",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#f5f5f5",
              fontSize: "12px",
              padding: "8px 12px",
          }
        : {
              backgroundColor: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: "8px",
              color: "#171717",
              fontSize: "12px",
              padding: "8px 12px",
          };
}

/** @deprecated Use getTooltipStyles(isDark) instead */
export const TOOLTIP_STYLES = {
    backgroundColor: "#141414",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#f5f5f5",
    fontSize: "12px",
    padding: "8px 12px",
} as const;

export const CHART_COLORS = [
    "#171717", // neutral-900
    "#525252", // neutral-600
    "#0ea5e9", // sky-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ef4444", // red-500
    "#06b6d4", // cyan-500
    "#ec4899", // pink-500
    "#84cc16", // lime-500
] as const;

// Semantic color mapping
export const SEMANTIC_COLORS = {
    votes: "#10b981",
    comments: "#f59e0b",
    submissions: "#0ea5e9",
    views: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    primary: "#171717",
} as const;

// Shared chart axis/grid helpers
export const CHART_AXIS_STROKE = "#a3a3a3";
export const CHART_AXIS_FONT_SIZE = 11;
export const CHART_GRID_STROKE = "rgba(163,163,163,0.15)";
