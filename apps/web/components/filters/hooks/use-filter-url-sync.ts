import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type FilterState } from '@/lib/utils/url-filter-sync';

interface UseFilterURLSyncOptions {
  basePath?: string;
  locale?: string;
  debounceMs?: number;
}

/**
 * Custom hook for synchronizing filter state with URL.
 *
 * 2026-05-10 (Spec 020): switched from `window.history.replaceState` to
 * Next.js `router.replace`. The previous History-API write changed the
 * URL silently and the server never re-rendered, which paired with the
 * also-removed client-side filter on the *full catalogue* to produce
 * working but very large (~3.7 MB) responses. With the server-side
 * filter/sort/slice in `app/[locale]/.../page.tsx`, the URL has to
 * trigger a real RSC navigation so the server produces a new filtered
 * slice. Debounce stays at 300ms so search-box typing still feels live.
 *
 * Note: Does not parse from URL to avoid useSearchParams() SSR issues.
 * Initial state should be passed via initialTag/initialCategory props instead.
 */
export function useFilterURLSync(options: UseFilterURLSyncOptions = {}) {
  const { debounceMs = 300 } = options;
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  /**
   * Update URL based on filter state.
   * Triggers an RSC navigation via Next.js router so the server re-renders
   * with the new filter params.
   * Debounced to avoid hammering the router on every keystroke.
   */
  const updateURL = useCallback(
    (filters: FilterState, immediate = false) => {
      const update = () => {
        if (typeof window === 'undefined') return;

        // On /categories/[slug] or /tags/[slug] pages, the URL already reflects the
        // initial filter from the server route. Don't append query params that would
        // conflict with the path (e.g. /categories/collaboration?categories=communication).
        const currentPath = window.location.pathname;
        if (/\/(categories|tags)\/[^/]+/.test(currentPath)) return;

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

        // Only push if the URL actually changed.
        if (newURL !== currentFullPath) {
          // `replace` (not `push`) — filter changes shouldn't grow the back
          // stack. `scroll: false` keeps the user's scroll position so the
          // listing doesn't jump back to the top while typing.
          router.replace(newURL, { scroll: false });
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
