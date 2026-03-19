import { useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { PaginationCounts } from "./types";
import type { SortOption } from "@/components/filters/types";
import { SORT_OPTIONS } from "@/components/shared-card/utils/sort-utils";

interface UsePaginationCountsParams {
  totalCount: number;
  filteredCount: number;
  currentPage: number;
  perPage: number;
  hasActiveFilters: boolean;
  isInfinite: boolean;
  sortBy?: SortOption;
}

/**
 * Hook to calculate pagination display counts and text
 *
 * Implements the logic for displaying:
 * - "Showing X items" when no filters are active
 * - "Showing Y of X items" when filters are active
 * - "Showing A-B" for the current page range
 */
export function usePaginationCounts({
  totalCount,
  filteredCount,
  currentPage,
  perPage,
  hasActiveFilters,
  isInfinite,
  sortBy,
}: UsePaginationCountsParams): PaginationCounts {
  const t = useTranslations("listing");

  // Get human-readable sort label
  const getSortLabel = useCallback(
    (sortKey: string): string => {
      switch (sortKey) {
        case SORT_OPTIONS.NAME_ASC:
          return t("NAME_A_Z");
        case SORT_OPTIONS.NAME_DESC:
          return t("NAME_Z_A");
        case SORT_OPTIONS.DATE_DESC:
          return t("NEWEST");
        case SORT_OPTIONS.DATE_ASC:
          return t("OLDEST");
        default:
          return t("POPULARITY");
      }
    },
    [t]
  );

  return useMemo(() => {
    const hasResults = filteredCount > 0;
    const start = currentPage * perPage;
    const startDisplay = hasResults ? start + 1 : 0;
    const endDisplay = hasResults
      ? isInfinite
        ? filteredCount
        : Math.min(start + perPage, filteredCount)
      : 0;

    // Build sort label suffix if applicable
    const sortSuffix =
      hasResults &&
      sortBy &&
      sortBy !== SORT_OPTIONS.POPULARITY
        ? ` (${t("SORTED_BY")} ${getSortLabel(sortBy)})`
        : "";

    // Count text logic:
    // - No filters: "Showing X items"
    // - With filters: "Showing Y of X items"
    // - With sort: append "(sorted by [label])"
    const countText = hasActiveFilters
      ? `${t("FILTER_STATUS", { filtered: filteredCount, total: totalCount })}${sortSuffix}`
      : `${t("SHOWING_TOTAL_ITEMS", { total: totalCount })}${sortSuffix}`;

    // Range text: "Showing 1-12"
    const rangeText = hasResults
      ? `${t("SHOWING")} ${startDisplay}-${endDisplay}`
      : `${t("SHOWING")} 0`;

    return {
      start,
      startDisplay,
      endDisplay,
      hasResults,
      countText,
      rangeText,
    };
  }, [totalCount, filteredCount, currentPage, perPage, hasActiveFilters, isInfinite, sortBy, getSortLabel, t]);
}
