"use client";

import { useContext, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useInView } from "react-intersection-observer";
import { layoutComponents, LayoutKey } from "@/components/layouts";
import LayoutMap from "@/components/layouts/LayoutMap";
import type { Category, ItemData, Tag } from "@/lib/content";
import { useLayoutTheme } from "@/components/context";
import { useLocationSettings } from "@/hooks/use-location-settings";
import { FilterContext } from "@/components/filters/context/filter-context";
import type { SortOption, TagId } from "@/components/filters/types";
import { useInfiniteLoading } from "@/hooks/use-infinite-loading";
import { PER_PAGE } from "@/lib/paginate";
import { SORT_OPTIONS } from "./utils/sort-utils";
import { useItemFiltering } from "./hooks/use-item-filtering";
import { useItemSorting } from "./hooks/use-item-sorting";
import { usePaginationLogic, useFilterChangeDetection } from "./hooks/use-pagination-logic";
import { SharedCardHeader, EmptyState } from "./shared-card-header";
import { SharedCardGrid } from "./shared-card-grid";
import { SharedCardPagination } from "./shared-card-pagination";

// ===================== Types =====================

export interface BaseCardProps {
  total: number;
  start: number;
  page: number;
  basePath: string;
  categories: Category[];
  tags: Tag[];
  items: ItemData[];
  totalCount?: number;
}

export interface CardConfigOptions {
  showStats?: boolean;
  showViewToggle?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showEmptyState?: boolean;
  enableSearch?: boolean;
  enableTagFilter?: boolean;
  enableSorting?: boolean;
  customEmptyMessage?: string;
  customEmptyDescription?: string;
  animationDelay?: number;
  perPage?: number;
  defaultLayout?: LayoutKey;
}

export interface ExtendedCardProps extends BaseCardProps {
  config?: CardConfigOptions;
  className?: string;
  onItemClick?: (item: ItemData) => void;
  renderCustomItem?: (item: ItemData, index: number) => React.ReactNode;
  renderCustomEmpty?: () => React.ReactNode;
  headerActions?: React.ReactNode;
}

interface FilterState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTags: TagId[];
  setSelectedTags: (tags: TagId[]) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  selectedTag: TagId | null;
  setSelectedTag: (tag: TagId | null) => void;
}

// ===================== Constants =====================

const DEFAULT_CONFIG: CardConfigOptions = {
  showStats: true,
  showViewToggle: true,
  showFilters: true,
  showPagination: true,
  showEmptyState: true,
  enableSearch: true,
  enableTagFilter: true,
  enableSorting: true,
  animationDelay: 100,
  perPage: PER_PAGE,
  defaultLayout: "classic",
};

// ===================== Custom Hooks =====================

/**
 * Hook to access filter context
 */
function useFilters(): FilterState {
  const context = useContext(FilterContext);

  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }

  return context;
}

/**
 * Hook to check if any filters are active
 */
function useHasActiveFilters(
  searchTerm: string,
  selectedTags: TagId[],
  selectedTag: TagId | null,
  sortBy: SortOption,
  enableSearch: boolean,
  enableTagFilter: boolean,
  enableSorting: boolean
): boolean {
  return useMemo(() => {
    const hasSearch = enableSearch && searchTerm.trim() !== "";
    const hasTags = enableTagFilter && selectedTags.length > 0;
    const hasSelectedTag = enableTagFilter && Boolean(selectedTag);
    const hasSort = enableSorting && sortBy !== SORT_OPTIONS.POPULARITY;
    return hasSearch || hasTags || hasSelectedTag || hasSort;
  }, [searchTerm, selectedTags, selectedTag, sortBy, enableSearch, enableTagFilter, enableSorting]);
}

// ===================== Main Component =====================

/**
 * SharedCard - Reusable card component for displaying lists of items
 *
 * This component orchestrates filtering, sorting, pagination, and display of items.
 * It follows SOLID principles:
 * - Single Responsibility: Each sub-component handles one concern
 * - Open/Closed: Extensible through config and render props
 * - Liskov Substitution: Can be used anywhere a card list is needed
 * - Interface Segregation: Minimal required props, optional config
 * - Dependency Inversion: Depends on abstractions (config, render props)
 *
 * @example
 * // Basic usage
 * <SharedCard {...props} config={CardPresets.simple} />
 *
 * // Advanced usage
 * <SharedCard
 *   {...props}
 *   config={CardPresets.fullListing}
 *   onItemClick={(item) => console.log(item)}
 *   renderCustomItem={(item) => <CustomItem {...item} />}
 * />
 */
export function SharedCard(props: ExtendedCardProps) {
  const {
    items,
    config: rawConfig,
    className = "",
    onItemClick,
    renderCustomItem,
    renderCustomEmpty,
    headerActions,
    page,
  } = props;

  // Merge config with defaults
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...rawConfig }), [rawConfig]);

  // Get theme and filter state
  const { layoutKey, setLayoutKey, paginationType, isMapView, setIsMapView } = useLayoutTheme();
  const { searchTerm, selectedTags, sortBy, selectedTag } = useFilters();
  const t = useTranslations("listing");

  // Map view availability
  const { settings: locationSettings } = useLocationSettings();
  const isMapAvailable = useMemo(() => {
    if (!locationSettings.enabled) return false;
    if (locationSettings.provider === 'mapbox') return Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
    if (locationSettings.provider === 'google') return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    return false;
  }, [locationSettings.enabled, locationSettings.provider]);

  // Get layout component
  const LayoutComponent = layoutComponents[layoutKey];

  // Filter items
  const filteredItems = useItemFiltering(
    items,
    searchTerm,
    selectedTags,
    selectedTag,
    {
      enableSearch: config.enableSearch ?? true,
      enableTagFilter: config.enableTagFilter ?? true,
    }
  );

  // Sort filtered items
  const sortedItems = useItemSorting(filteredItems, sortBy, {
    enableSorting: config.enableSorting ?? true,
  });

  // Handle pagination
  const {
    paginatedItems,
    currentPage,
    totalPages,
    handlePageChange,
    resetToFirstPage,
  } = usePaginationLogic(sortedItems, {
    perPage: config.perPage,
    showPagination: config.showPagination ?? true,
  });

  // Reset pagination when filters change
  useFilterChangeDetection(
    searchTerm,
    selectedTags,
    selectedTag,
    sortBy,
    resetToFirstPage
  );

  // Handle infinite scroll
  const { displayedItems, hasMore, isLoading, error, loadMore } = useInfiniteLoading({
    items: sortedItems,
    initialPage: page,
    perPage: config.perPage,
  });

  const { ref: loadMoreRef } = useInView({
    onChange: (inView) => {
      if (
        inView &&
        !isLoading &&
        hasMore &&
        paginationType === "infinite" &&
        displayedItems.length > 0
      ) {
        loadMore();
      }
    },
    threshold: 0.5,
    rootMargin: "100px",
  });

  // Check if filters are active
  const hasActiveFilters = useHasActiveFilters(
    searchTerm,
    selectedTags,
    selectedTag,
    sortBy,
    config.enableSearch ?? true,
    config.enableTagFilter ?? true,
    config.enableSorting ?? true
  );

  // Calculate counts (single source of truth)
  const filteredCount = sortedItems.length;
  const totalCount = props.totalCount ?? items.length;

  // Handle view change (also exits map mode)
  const handleViewChange = useCallback(
    (newView: LayoutKey) => {
      setLayoutKey(newView);
      if (isMapView) setIsMapView(false);
    },
    [setLayoutKey, isMapView, setIsMapView]
  );

  // Handle map toggle
  const handleMapToggle = useCallback(() => {
    setIsMapView(!isMapView);
  }, [isMapView, setIsMapView]);

  // Determine items to display
  const itemsToDisplay = paginationType === "infinite" ? displayedItems : paginatedItems;

  // Show empty state if no items
  const showEmptyState = config.showEmptyState && sortedItems.length === 0;

  if (showEmptyState) {
    if (renderCustomEmpty) {
      return renderCustomEmpty();
    }
    return (
      <EmptyState
        searchTerm={searchTerm}
        selectedTags={selectedTags}
        selectedTag={selectedTag}
        tags={props.tags}
        t={t}
        customMessage={config.customEmptyMessage}
        customDescription={config.customEmptyDescription}
        className={className}
      />
    );
  }

  return (
    <div className={`w-full space-y-6 ${className}`} suppressHydrationWarning>
      <SharedCardHeader
        searchTerm={searchTerm}
        selectedTags={selectedTags}
        selectedTag={selectedTag}
        sortBy={sortBy}
        filteredCount={filteredCount}
        totalCount={totalCount}
        isInfinite={paginationType === "infinite"}
        start={paginationType === "infinite" ? 0 : (currentPage - 1) * (config.perPage || PER_PAGE)}
        hasActiveFilters={hasActiveFilters}
        config={config}
        tags={props.tags}
        headerActions={headerActions}
        layoutKey={layoutKey}
        onViewChange={handleViewChange}
        isMapAvailable={isMapAvailable}
        isMapActive={isMapView}
        onMapToggle={handleMapToggle}
      />

      <div className="space-y-4">
        {isMapView && isMapAvailable ? (
          <LayoutMap items={sortedItems} />
        ) : (
          <>
            <SharedCardGrid
              items={itemsToDisplay}
              LayoutComponent={LayoutComponent}
              layout={layoutKey}
              onItemClick={onItemClick}
              renderCustomItem={renderCustomItem}
              animationDelay={config.animationDelay}
            />

            {config.showPagination && (
              <SharedCardPagination
                paginationType={paginationType}
                standardPaginationProps={
                  paginationType === "standard" && totalPages > 1
                    ? {
                        currentPage,
                        totalPages,
                        onPageChange: handlePageChange,
                      }
                    : undefined
                }
                infiniteScrollProps={
                  paginationType === "infinite"
                    ? {
                        loadMoreRef,
                        hasMore,
                        isLoading,
                        error,
                        onRetry: loadMore,
                      }
                    : undefined
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===================== Exports =====================

// Alias for compatibility
export const Card = SharedCard;

// Preset configurations
export const CardPresets = {
  fullListing: {
    showStats: true,
    showViewToggle: true,
    showFilters: true,
    showPagination: true,
    showEmptyState: true,
    enableSearch: true,
    enableTagFilter: true,
    enableSorting: true,
  } as CardConfigOptions,

  showViewToggle: {
    showStats: true,
    showViewToggle: false,
    showFilters: true,
    showPagination: true,
    showEmptyState: true,
    enableSearch: true,
    enableTagFilter: true,
    enableSorting: true,
  } as CardConfigOptions,

  homeTwoListing: {
    showStats: false,
    showViewToggle: false,
    showFilters: false,
    showPagination: true,
    showEmptyState: true,
    enableSearch: false,
    enableTagFilter: false,
    enableSorting: true,
  } as CardConfigOptions,

  simple: {
    showStats: false,
    showViewToggle: false,
    showFilters: false,
    showPagination: false,
    showEmptyState: true,
    enableSearch: false,
    enableTagFilter: false,
    enableSorting: false,
  } as CardConfigOptions,

  productGrid: {
    showStats: true,
    showViewToggle: true,
    showFilters: true,
    showPagination: true,
    showEmptyState: true,
    enableSearch: true,
    enableTagFilter: true,
    enableSorting: true,
    defaultLayout: "grid" as LayoutKey,
  } as CardConfigOptions,

  searchResults: {
    showStats: true,
    showViewToggle: false,
    showFilters: true,
    showPagination: true,
    showEmptyState: true,
    enableSearch: true,
    enableTagFilter: true,
    enableSorting: true,
    customEmptyMessage: "No results found",
  } as CardConfigOptions,
};

// Simplified component for quick use cases
export function SimpleCard(props: BaseCardProps & { preset?: keyof typeof CardPresets }) {
  const config = props.preset ? CardPresets[props.preset] : CardPresets.simple;
  return <Card {...props} config={config} />;
}

// Re-export utilities and constants
export { SORT_OPTIONS } from "./utils/sort-utils";
export { getTagId, getTagName } from "./utils/filter-utils";
