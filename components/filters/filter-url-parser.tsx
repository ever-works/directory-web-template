"use client";

import { useSearchParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { useFilters } from '@/hooks/use-filters';

/**
 * Client component that parses URL query parameters and path and initializes filter state
 * Must be wrapped in Suspense boundary
 */
function FilterURLParserContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname(); // This strips the locale prefix automatically
  const {
    setSelectedTags, setSelectedCategories, selectedTags, selectedCategories,
    setNearMe, setLocationCity, setLocationCountry, clearLocationFilter, locationFilter,
    setSearchTerm, searchTerm,
  } = useFilters();
  const lastUrlRef = useRef('');
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    // Create a URL signature to detect actual URL changes
    const currentUrl = `${pathname}?${searchParams.toString()}`;

    // Skip if URL hasn't changed
    if (currentUrl === lastUrlRef.current) {
      return;
    }

    // Capture previous URL BEFORE updating (critical for transition detection)
    const prevUrl = lastUrlRef.current;

    // Skip if we're currently updating (prevents race conditions)
    if (isUpdatingRef.current) {
      lastUrlRef.current = currentUrl;
      return;
    }

    const tagsParam = searchParams.get('tags');
    const categoriesParam = searchParams.get('categories');
    const queryParam = searchParams.get('q');

    // Check if URL path is /tags/[tag] or /categories/[category]
    // Handle both with and without locale prefix (e.g., /en/tags/open-source or /tags/open-source)
    const tagMatch = pathname.match(/\/tags\/([^/]+)$/);
    const categoryMatch = pathname.match(/\/categories\/([^/]+)$/);

    // CRITICAL FIX: When on root path (/) with no query params during navigation,
    // it's likely a timing issue. Don't clear filters unless we're intentionally going to root.
    // Location params
    const nearLatParam = searchParams.get('near_lat');
    const nearLngParam = searchParams.get('near_lng');
    const radiusParam = searchParams.get('radius');
    const cityParam = searchParams.get('city');
    const countryParam = searchParams.get('country');
    const hasLocationParams = !!(nearLatParam || cityParam || countryParam);

    if (pathname === '/' && !tagsParam && !categoriesParam && !tagMatch && !categoryMatch && !hasLocationParams && !queryParam) {
      // Check if the previous URL had filters (indicates we're transitioning)
      const wasOnFilteredPage = prevUrl.includes('categories=') ||
                                 prevUrl.includes('tags=') ||
                                 prevUrl.includes('/categories/') ||
                                 prevUrl.includes('/tags/') ||
                                 prevUrl.includes('near_lat=') ||
                                 prevUrl.includes('city=') ||
                                 prevUrl.includes('country=') ||
                                 prevUrl.includes('q=');

      if (wasOnFilteredPage && isUpdatingRef.current) {
        // Don't update lastUrlRef - we want to process the real URL when it arrives
        return;
      }
      // otherwise let the parser continue so genuine navigation to "/" clears state
    }

    // Parse the filters from URL
    let urlTags: string[] = [];
    let urlCategories: string[] = [];

    // Parse query parameters first (highest priority)
    if (tagsParam || categoriesParam) {
      if (tagsParam) {
        try {
          urlTags = tagsParam.split(',').map(tag => decodeURIComponent(tag.trim())).filter(Boolean);
        } catch (error) {
          console.error('Error parsing tags parameter:', error);
        }
      }

      if (categoriesParam) {
        try {
          urlCategories = categoriesParam.split(',').map(cat => decodeURIComponent(cat.trim())).filter(Boolean);
        } catch (error) {
          console.error('Error parsing categories parameter:', error);
        }
      }
    }
    // Parse URL path for single tag/category
    else if (tagMatch) {
      try {
        const tag = decodeURIComponent(tagMatch[1]);
        urlTags = [tag];
      } catch (error) {
        console.error('Error parsing tag from path:', error);
      }
    } else if (categoryMatch) {
      try {
        const category = decodeURIComponent(categoryMatch[1]);
        urlCategories = [category];
      } catch (error) {
        console.error('Error parsing category from path:', error);
      }
    }

    // Only update state if it's different from current state
    const tagsChanged = JSON.stringify(urlTags) !== JSON.stringify(selectedTags);
    const categoriesChanged = JSON.stringify(urlCategories) !== JSON.stringify(selectedCategories);

    if (tagsChanged || categoriesChanged) {
      isUpdatingRef.current = true;

      if (tagsChanged) {
        setSelectedTags(urlTags);
      }

      if (categoriesChanged) {
        setSelectedCategories(urlCategories);
      }

      // Reset the flag after a delay to allow the URL update to complete
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    }

    // Parse location filters from URL
    if (nearLatParam && nearLngParam) {
      const lat = parseFloat(nearLatParam);
      const lng = parseFloat(nearLngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        const parsedRadius = radiusParam ? parseInt(radiusParam, 10) : 50;
        const radius = Number.isFinite(parsedRadius) ? parsedRadius : 50;
        const currentNearMe = locationFilter.nearMe;
        if (!currentNearMe || currentNearMe.latitude !== lat || currentNearMe.longitude !== lng || currentNearMe.radius !== radius) {
          setNearMe({ latitude: lat, longitude: lng, radius });
        }
      }
    } else if (cityParam) {
      if (locationFilter.city !== cityParam) {
        setLocationCity(cityParam);
      }
    } else if (countryParam) {
      if (locationFilter.country !== countryParam) {
        setLocationCountry(countryParam);
      }
    } else {
      // No location params in URL → clear location state if any is active
      const hasActiveLocation = !!(locationFilter.nearMe || locationFilter.city || locationFilter.country);
      if (hasActiveLocation) {
        clearLocationFilter();
      }
    }

    // Parse search query from URL (for sitelinks search box support)
    // Note: useSearchParams().get() already returns decoded values, no need for decodeURIComponent
    if (queryParam) {
      const trimmedQuery = queryParam.trim();
      if (trimmedQuery && trimmedQuery !== searchTerm) {
        setSearchTerm(trimmedQuery);
      }
    } else if (searchTerm && !queryParam) {
      // Clear search term if q param was removed from URL
      // Only clear if we're on a page that should not have a search term
      // (i.e., the URL changed and no longer has q param)
      if (prevUrl.includes('q=')) {
        setSearchTerm('');
      }
    }

    // Update lastUrlRef at the very end, after all logic has completed
    lastUrlRef.current = currentUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]); // Only depend on URL changes, not filter state

  return null;
}

/**
 * Wrapper component with Suspense boundary for FilterURLParserContent
 * Use this in pages that need to parse filter query parameters
 */
export function FilterURLParser() {
  return (
    <Suspense fallback={null}>
      <FilterURLParserContent />
    </Suspense>
  );
}
