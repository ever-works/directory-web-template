/**
 * Filter component constants
 * Centralized configuration for filter components
 */

export const FILTER_CONSTANTS = {
  // Tag visibility
  MAX_VISIBLE_TAGS: 8,
  TEXT_TRUNCATE_LENGTH: 20,

  // Text display
  MASONRY_EXCERPT_MAX_CHARS: 512,

  // Sticky behavior
  SCROLL_THRESHOLD: 250,
  STICKY_OFFSET: 4,
  
  // Pagination
  SCROLL_DURATION: 600,
  SCROLL_THRESHOLD_PX: 100,
  NAVIGATE_DELAY: 800,
  
  // UI
  TOOLTIP_DELAY: 300,
  TOOLTIP_CLOSE_DELAY: 100,
  TRANSITION_DURATION: 300,
  
  // Responsive breakpoints
  MOBILE_BREAKPOINT: 'md',
} as const;

export const SORT_OPTIONS = {
  POPULARITY: 'popularity',
  NAME_ASC: 'name-asc',
  NAME_DESC: 'name-desc',
  DATE_DESC: 'date-desc',
  DATE_ASC: 'date-asc',
} as const;

export const SORT_LABELS = {
  [SORT_OPTIONS.POPULARITY]: 'POPULARITY',
  [SORT_OPTIONS.NAME_ASC]: 'NAME_A_Z',
  [SORT_OPTIONS.NAME_DESC]: 'NAME_Z_A',
  [SORT_OPTIONS.DATE_DESC]: 'NEWEST',
  [SORT_OPTIONS.DATE_ASC]: 'OLDEST',
} as const; 