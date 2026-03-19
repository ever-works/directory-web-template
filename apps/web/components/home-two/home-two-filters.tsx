'use client';

import { Category, Tag } from '@/lib/content';
import { HomeTwoSortSelector, HomeTwoTagsSelector } from '.';
import { useFilters } from '@/hooks/use-filters';
import { SearchInput } from '../ui/search-input';
import { HomeTwoCategories } from './home-two-categories';
import { LayoutKey } from '../layouts';
import { SortOption } from '../filters/types';
import { LayoutSettings } from '../layout-settings';
import { Button } from '@heroui/react';
import { useState } from 'react';
import clsx from 'clsx';

const SORT_OPTIONS: SortOption[] = ['popularity', 'name-asc', 'name-desc', 'date-desc', 'date-asc'];

// Style constants (tighter spacing)
const FILTERS_CONTAINER = 'space-y-1 sm:space-y-2';
const MOBILE_FILTERS = 'block sm:hidden space-y-1';
const TABLET_FILTERS = 'hidden sm:block md:hidden';
const DESKTOP_FILTERS = 'hidden md:flex justify-between items-center gap-2';
const FILTERS_GROUP = 'flex items-center gap-1';

type Home2FiltersProps = {
  categories: Category[];
  tags: Tag[];
  layoutKey: LayoutKey;
  setLayoutKey: (layoutKey: LayoutKey) => void;
  onFilterChange?: () => void;
  totalCount?: number;
  filteredCount?: number;
  searchEnabled?: boolean;
  isSticky?: boolean;
};

export function HomeTwoFilters({
  categories,
  tags,
  onFilterChange,
  totalCount,
  filteredCount,
  searchEnabled = true,
  isSticky = false
}: Home2FiltersProps) {
  const {
    searchTerm,
    setSearchTerm,
    setSortBy,
    sortBy,
    selectedCategories,
    toggleSelectedCategory,
    clearSelectedCategories,
    selectedTags,
    toggleSelectedTag
  } = useFilters();

  const [showAllCategories, setShowAllCategories] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    if (categoryId === 'clear-all') {
      clearSelectedCategories();
    } else {
      toggleSelectedCategory(categoryId);
    }
    onFilterChange?.();
  };

  const handleTagToggle = (tagId: string) => {
    toggleSelectedTag(tagId);
    onFilterChange?.();
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    onFilterChange?.();
  };

  const handleSortChange = (sort: string) => {
    if (SORT_OPTIONS.includes(sort as SortOption)) {
      setSortBy(sort as SortOption);
      onFilterChange?.();
    }
  };

  return (
    <div className={FILTERS_CONTAINER}>
      {/* Mobile Layout */}
      <div className={MOBILE_FILTERS}>
        {searchEnabled && (
          <div className="w-full">
            <SearchInput searchTerm={searchTerm} setSearchTerm={handleSearchChange} className="w-full" />
          </div>
        )}

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-1">
            <HomeTwoSortSelector setSortBy={handleSortChange} sortBy={sortBy} />
            <HomeTwoTagsSelector tags={tags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />
          </div>
          <LayoutSettings isParentSticky={isSticky} />
        </div>
      </div>

      {/* Tablet Layout */}
      <div className={TABLET_FILTERS}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className={FILTERS_GROUP}>
              <HomeTwoSortSelector setSortBy={handleSortChange} sortBy={sortBy} />
              <HomeTwoTagsSelector
                tags={tags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
              />
            </div>
            <LayoutSettings isParentSticky={isSticky} />
          </div>

          {searchEnabled && (
            <div className="w-full">
              <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={handleSearchChange}
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className={DESKTOP_FILTERS}>
        {/* Left Side: Sort and Tags */}
        <div className={FILTERS_GROUP}>
          <HomeTwoSortSelector setSortBy={handleSortChange} sortBy={sortBy} />
          <HomeTwoTagsSelector tags={tags} selectedTags={selectedTags} onTagToggle={handleTagToggle} />
        </div>

        {/* Right Side: Search and Layout */}
        <div className={FILTERS_GROUP}>
          {searchEnabled && (
            <div className="w-64 lg:w-80 xl:w-96">
              <SearchInput searchTerm={searchTerm} setSearchTerm={handleSearchChange} />
            </div>
          )}
          <LayoutSettings isParentSticky={isSticky} />
        </div>
      </div>

      <HomeTwoCategories
        categories={categories}
        mode="filter"
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        totalItems={categories.reduce((sum, cat) => sum + (cat.count || 0), 0)}
        showAllCategories={showAllCategories}
      />

      {/* New Row: Items count and Toggle button */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-white/[0.06]">
        {/* Left: Showing X of Y items (reduced size) */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {filteredCount !== undefined && totalCount !== undefined ? (
            filteredCount === totalCount ? (
              <span>Showing {totalCount} items</span>
            ) : (
              <span>
                Showing {filteredCount} of {totalCount} items
              </span>
            )
          ) : null}
        </div>

        {/* Right: Show all categories toggle button */}
        {categories.length > 5 && (
          <Button
            className={clsx(
              'px-2 py-0.5 font-medium transition-colors duration-150 rounded-full',
              'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/6',
              'hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/8',
              'text-[11px] sm:text-xs h-7',
              'focus:outline-hidden'
            )}
            onPress={() => setShowAllCategories(!showAllCategories)}
            aria-expanded={showAllCategories}
            aria-label={
              showAllCategories
                ? 'Collapse categories to single row'
                : `Expand to show all ${categories.length} categories`
            }
          >
            {showAllCategories ? (
              <>
                <span className="hidden sm:inline">Show as single row</span>
                <span className="sm:hidden">Single row</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-1 transition-transform"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10h18M3 14h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Show all {categories.length} categories</span>
                <span className="sm:hidden">All categories</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-1 transition-transform"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4h16v7H4V4zm0 9h16v7H4v-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
