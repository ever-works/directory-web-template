import { useCallback, useEffect, useRef } from 'react';
import { generateFilterURL, type FilterState } from '@/lib/utils/url-filter-sync';

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
  const { basePath = '/', locale, debounceMs = 300 } = options;
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

        const newURL = generateFilterURL(filters, { basePath, locale });

        // Get current full URL (pathname + search)
        const currentFullPath = window.location.pathname + window.location.search;

        // Normalize URLs for comparison
        const normalize = (url: string) => {
          let normalized = url;

          // Remove trailing ? if present
          if (normalized.endsWith('?')) {
            normalized = normalized.slice(0, -1);
          }

          // Remove locale prefix for comparison (e.g., /en/tags/foo -> /tags/foo)
          if (locale && normalized.startsWith(`/${locale}/`)) {
            normalized = normalized.substring(locale.length + 1);
          } else if (locale && normalized === `/${locale}`) {
            normalized = '/';
          }

          return normalized;
        };

        const normalizedNewURL = normalize(newURL);
        const normalizedCurrentPath = normalize(currentFullPath);

        // Only update if the URL actually changed
        if (normalizedNewURL !== normalizedCurrentPath) {
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
    [basePath, locale, debounceMs]
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
