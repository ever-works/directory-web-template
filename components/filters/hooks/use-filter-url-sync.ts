import { useCallback, useEffect, useRef } from 'react';
import { type FilterState } from '@/lib/utils/url-filter-sync';

interface UseFilterURLSyncOptions {
  basePath?: string;
  locale?: string;
  debounceMs?: number;
}

/**
 * Custom hook for synchronizing filter state with URL
 * Handles URL updates when filters change
 *
 * Note: Does not parse from URL to avoid useSearchParams() SSR issues.
 * Initial state should be passed via initialTag/initialCategory props instead.
 */
export function useFilterURLSync(options: UseFilterURLSyncOptions = {}) {
  const { debounceMs = 300 } = options;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Update URL based on filter state
   * Uses replaceState to avoid triggering Next.js server navigation
   * Uses debouncing to avoid excessive history entries
   */
  const updateURL = useCallback(
    (filters: FilterState, immediate = false) => {
      const update = () => {
        if (typeof window === 'undefined') return;

        // Build query params from current filter state.
        // Keep the current pathname to avoid triggering Next.js soft navigation.
        const params = new URLSearchParams();

        if (filters.tags.length > 0) {
          params.set('tags', filters.tags.join(','));
        }
        if (filters.categories.length > 0) {
          params.set('categories', filters.categories.join(','));
        }
        if (filters.q) {
          params.set('q', filters.q);
        }
        if (filters.nearLat != null && filters.nearLng != null) {
          params.set('near_lat', String(filters.nearLat));
          params.set('near_lng', String(filters.nearLng));
          if (filters.radius != null) params.set('radius', String(filters.radius));
        } else if (filters.city) {
          params.set('city', filters.city);
        } else if (filters.country) {
          params.set('country', filters.country);
        }

        const queryString = params.toString();
        const newURL = queryString
          ? `${window.location.pathname}?${queryString}`
          : window.location.pathname;

        const currentFullPath = window.location.pathname + window.location.search;

        // Only update if the URL actually changed
        if (newURL !== currentFullPath) {
          window.history.replaceState(null, '', newURL);
        }
      };

      if (immediate) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        update();
      } else {
        // Debounce URL updates to avoid creating too many history entries
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          update();
        }, debounceMs);
      }
    },
    [debounceMs]
  );

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    updateURL,
  };
}
