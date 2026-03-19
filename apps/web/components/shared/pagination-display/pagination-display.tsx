"use client";

import { clsx } from "clsx";
import { usePaginationCounts } from "./use-pagination-counts";
import type { PaginationDisplayProps } from "./types";

const countTextClasses = "text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300";

/**
 * PaginationDisplay component
 *
 * Displays pagination information according to the following rules:
 * - No filters active: "Showing X items"
 * - Filters active: "Showing Y of X items"
 *
 * This component provides a single source of truth for pagination count display logic.
 */
export function PaginationDisplay({
  totalCount,
  filteredCount,
  currentPage,
  perPage,
  hasActiveFilters,
  isInfinite = false,
  sortBy,
  className = "",
}: PaginationDisplayProps) {
  const { countText } = usePaginationCounts({
    totalCount,
    filteredCount,
    currentPage,
    perPage,
    hasActiveFilters,
    isInfinite,
    sortBy,
  });

  return (
    <div className={clsx("flex items-center", className)}>
      <div className={countTextClasses}>{countText}</div>
    </div>
  );
}
