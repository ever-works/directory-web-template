import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { SORT_OPTIONS } from '../constants';
import { SortOption, TagId, CategoryId, LocationFilterState, NearMeCoordinates } from '../types';
import { useFilterURLSync } from './use-filter-url-sync';
import type { FilterState } from '@/lib/utils/url-filter-sync';

/**
 * Type guard to check if a string is a valid SortOption
 */
function isValidSortOption(value: string): value is SortOption {
  return ['popularity', 'name-asc', 'name-desc', 'date-desc', 'date-asc'].includes(value);
}

/**
 * Custom hook for managing filter state
 * Handles search term, selected tags, and sorting
 * Automatically syncs with URL for bookmarkable/shareable filter states
 */
export function useFilterState(initialTag?: string | null, initialCategory?: string | null, initialSortBy?: string) {
  const params = useParams();
  const locale = params?.locale as string | undefined;

  const [searchTerm, setSearchTermInternal] = useState("");
  const searchTermRef = useRef("");

  /** Multiple tag selection for advanced filtering - allows selecting multiple tags simultaneously */
  const [selectedTags, setSelectedTagsInternal] = useState<TagId[]>(
    initialTag ? [initialTag] : []
  );
  const selectedTagsRef = useRef<TagId[]>(initialTag ? [initialTag] : []);

  /** Multiple category selection for advanced filtering */
  const [selectedCategories, setSelectedCategoriesInternal] = useState<CategoryId[]>(
    initialCategory ? [initialCategory] : []
  );
  const selectedCategoriesRef = useRef<CategoryId[]>(initialCategory ? [initialCategory] : []);

  const [sortBy, setSortBy] = useState<SortOption>(
    initialSortBy && isValidSortOption(initialSortBy) ? initialSortBy : SORT_OPTIONS.POPULARITY
  );

  /** Single tag selection for navigation - used when navigating to a specific tag page */
  const [selectedTag, setSelectedTag] = useState<TagId | null>(initialTag || null);

  /** Currently selected category for navigation and filtering */
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(initialCategory || null);

  /** Loading state for filter updates */
  const [isFiltersLoading, setIsFiltersLoading] = useState(false);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Location filter state */
  const [locationFilter, setLocationFilterInternal] = useState<LocationFilterState>({});
  const locationFilterRef = useRef<LocationFilterState>({});

  // URL synchronization (only for updates, not parsing)
  const { updateURL } = useFilterURLSync({ basePath: '/', locale });

  /**
   * Cleanup: Clear loading timeout on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Build extra fields for FilterState from current refs (location + search term)
   */
  const getExtraFilterStateFields = useCallback((): Partial<FilterState> => {
    const loc = locationFilterRef.current;
    const fields: Partial<FilterState> = {};
    if (loc.nearMe) {
      fields.nearLat = loc.nearMe.latitude;
      fields.nearLng = loc.nearMe.longitude;
      fields.radius = loc.nearMe.radius;
    }
    if (loc.city) fields.city = loc.city;
    if (loc.country) fields.country = loc.country;
    if (searchTermRef.current) fields.q = searchTermRef.current;
    return fields;
  }, []);

  /**
   * Trigger loading indicator and URL update
   */
  const syncFilterURL = useCallback((filterState: FilterState) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    setIsFiltersLoading(true);
    updateURL(filterState);
    // Scroll to tags/filter section so user sees new filtered results
    if (typeof window !== 'undefined' && window.scrollY > 100) {
      const target = document.querySelector('[data-filter-scroll-target]');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    loadingTimeoutRef.current = setTimeout(() => {
      setIsFiltersLoading(false);
    }, 400);
  }, [updateURL]);

  /**
   * Wrapped setter that updates both state and URL
   */
  const setSelectedTags = useCallback((tags: TagId[] | ((prev: TagId[]) => TagId[])) => {
    setSelectedTagsInternal(prev => {
      const computedTags = typeof tags === 'function' ? tags(prev) : tags;
      selectedTagsRef.current = computedTags;
      return computedTags;
    });
    syncFilterURL({
      tags: selectedTagsRef.current,
      categories: selectedCategoriesRef.current,
      ...getExtraFilterStateFields(),
    });
  }, [syncFilterURL, getExtraFilterStateFields]);

  /**
   * Wrapped setter that updates both state and URL
   */
  const setSelectedCategories = useCallback((categories: CategoryId[] | ((prev: CategoryId[]) => CategoryId[])) => {
    setSelectedCategoriesInternal(prev => {
      const computedCategories = typeof categories === 'function' ? categories(prev) : categories;
      selectedCategoriesRef.current = computedCategories;
      return computedCategories;
    });
    syncFilterURL({
      tags: selectedTagsRef.current,
      categories: selectedCategoriesRef.current,
      ...getExtraFilterStateFields(),
    });
  }, [syncFilterURL, getExtraFilterStateFields]);

  /**
   * Wrapped setter that updates both search term state and URL
   */
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermInternal(term);
    searchTermRef.current = term;

    syncFilterURL({
      tags: selectedTagsRef.current,
      categories: selectedCategoriesRef.current,
      ...getExtraFilterStateFields(),
      q: term || undefined,
    });
  }, [syncFilterURL, getExtraFilterStateFields]);

  /**
   * Clear all active filters
   */
  const clearAllFilters = useCallback(() => {
    setSearchTermInternal("");
    searchTermRef.current = "";
    setSelectedTagsInternal([]);
    selectedTagsRef.current = [];
    setSelectedCategoriesInternal([]);
    selectedCategoriesRef.current = [];
    setSortBy(SORT_OPTIONS.POPULARITY);
    setSelectedTag(null);
    setSelectedCategory(null);
    setLocationFilterInternal({});
    locationFilterRef.current = {};

    // Update URL to clear all filters including location
    updateURL({ tags: [], categories: [] }, true);
  }, [updateURL]);

  /**
   * Remove a specific tag from selected tags
   */
  const removeSelectedTag = useCallback((tagId: TagId) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId));
  }, [setSelectedTags]);

  /**
   * Add a tag to selected tags
   */
  const addSelectedTag = useCallback((tagId: TagId) => {
    setSelectedTags(prev => [...prev, tagId]);
  }, [setSelectedTags]);

  /**
   * Toggle a tag selection
   */
  const toggleSelectedTag = useCallback((tagId: TagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, [setSelectedTags]);

  /**
   * Remove a specific category from selected categories
   */
  const removeSelectedCategory = useCallback((categoryId: CategoryId) => {
    setSelectedCategories(prev => prev.filter(id => id !== categoryId));
  }, [setSelectedCategories]);

  /**
   * Add a category to selected categories
   */
  const addSelectedCategory = useCallback((categoryId: CategoryId) => {
    setSelectedCategories(prev => [...prev, categoryId]);
  }, [setSelectedCategories]);

  /**
   * Toggle a category selection
   */
  const toggleSelectedCategory = useCallback((categoryId: CategoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, [setSelectedCategories]);

  /**
   * Clear all selected categories
   */
  const clearSelectedCategories = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  // ===================== Location Filter Actions =====================

  /**
   * Helper to update location state, ref, and sync URL
   */
  const updateLocationFilter = useCallback((newFilter: LocationFilterState) => {
    setLocationFilterInternal(newFilter);
    locationFilterRef.current = newFilter;

    // Build location fields for URL
    const locationFields: Partial<FilterState> = {};
    if (newFilter.nearMe) {
      locationFields.nearLat = newFilter.nearMe.latitude;
      locationFields.nearLng = newFilter.nearMe.longitude;
      locationFields.radius = newFilter.nearMe.radius;
    }
    if (newFilter.city) locationFields.city = newFilter.city;
    if (newFilter.country) locationFields.country = newFilter.country;

    syncFilterURL({
      tags: selectedTagsRef.current,
      categories: selectedCategoriesRef.current,
      q: searchTermRef.current || undefined,
      ...locationFields,
    });
  }, [syncFilterURL]);

  /**
   * Set or clear Near Me filter
   */
  const setNearMe = useCallback((coords: NearMeCoordinates | null) => {
    if (coords) {
      updateLocationFilter({
        nearMe: coords,
        sortByDistance: true,
        city: undefined,
        country: undefined,
      });
    } else {
      updateLocationFilter({
        ...locationFilterRef.current,
        nearMe: undefined,
        sortByDistance: false,
      });
    }
  }, [updateLocationFilter]);

  /**
   * Update the radius for Near Me filter
   */
  const setLocationRadius = useCallback((radius: number) => {
    const current = locationFilterRef.current;
    if (!current.nearMe) return;
    updateLocationFilter({
      ...current,
      nearMe: { ...current.nearMe, radius },
    });
  }, [updateLocationFilter]);

  /**
   * Set or clear city filter
   */
  const setLocationCity = useCallback((city: string | null) => {
    updateLocationFilter({
      ...locationFilterRef.current,
      city: city || undefined,
      country: undefined,
      nearMe: undefined,
      sortByDistance: false,
    });
  }, [updateLocationFilter]);

  /**
   * Set or clear country filter
   */
  const setLocationCountry = useCallback((country: string | null) => {
    updateLocationFilter({
      ...locationFilterRef.current,
      country: country || undefined,
      city: undefined,
      nearMe: undefined,
      sortByDistance: false,
    });
  }, [updateLocationFilter]);

  /**
   * Clear all location filters
   */
  const clearLocationFilter = useCallback(() => {
    updateLocationFilter({});
  }, [updateLocationFilter]);

  return useMemo(() => ({
    // State
    searchTerm,
    selectedTags,
    selectedCategories,
    sortBy,
    selectedTag,
    selectedCategory,
    isFiltersLoading,

    // Setters
    setSearchTerm,
    setSelectedTags,
    setSelectedCategories,
    setSortBy,
    setSelectedTag,
    setSelectedCategory,

    // Actions
    clearAllFilters,
    removeSelectedTag,
    addSelectedTag,
    toggleSelectedTag,
    removeSelectedCategory,
    addSelectedCategory,
    toggleSelectedCategory,
    clearSelectedCategories,

    // Location filter
    locationFilter,
    setNearMe,
    setLocationRadius,
    setLocationCity,
    setLocationCountry,
    clearLocationFilter,
  }), [
    searchTerm,
    selectedTags,
    selectedCategories,
    sortBy,
    selectedTag,
    selectedCategory,
    isFiltersLoading,
    setSearchTerm,
    setSelectedTags,
    setSelectedCategories,
    setSortBy,
    setSelectedTag,
    setSelectedCategory,
    clearAllFilters,
    removeSelectedTag,
    addSelectedTag,
    toggleSelectedTag,
    removeSelectedCategory,
    addSelectedCategory,
    toggleSelectedCategory,
    clearSelectedCategories,
    locationFilter,
    setNearMe,
    setLocationRadius,
    setLocationCity,
    setLocationCountry,
    clearLocationFilter,
  ]);
} 