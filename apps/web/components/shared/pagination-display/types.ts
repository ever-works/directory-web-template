import type { SortOption } from "@/components/filters/types";

export interface PaginationDisplayProps {
  /**
   * Total number of items (unfiltered)
   */
  totalCount: number;

  /**
   * Number of items after applying filters
   */
  filteredCount: number;

  /**
   * Current page number (0-indexed)
   */
  currentPage: number;

  /**
   * Number of items to display per page
   */
  perPage: number;

  /**
   * Whether any filters are currently active (search, tags, categories)
   */
  hasActiveFilters: boolean;

  /**
   * Whether infinite scroll is enabled
   */
  isInfinite?: boolean;

  /**
   * Current sort option (optional)
   */
  sortBy?: SortOption;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

export interface PaginationCounts {
  /**
   * Starting position in the full list (0-indexed)
   */
  start: number;

  /**
   * Display start position (1-indexed for user display)
   */
  startDisplay: number;

  /**
   * Display end position (1-indexed for user display)
   */
  endDisplay: number;

  /**
   * Whether there are any results to display
   */
  hasResults: boolean;

  /**
   * Count text to display (e.g., "Showing 218 items" or "Showing 50 of 218 items")
   */
  countText: string;

  /**
   * Range text to display (e.g., "Showing 1-12")
   */
  rangeText: string;
}
