"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { Filter, Search } from "lucide-react";
import { clsx } from "clsx";
import type { Tag } from "@/lib/content";
import type { SortOption } from "@/components/filters/types";
import { PER_PAGE } from "@/lib/paginate";
import { getTagName } from "./utils/filter-utils";
import type { CardConfigOptions } from "./index";
import ViewToggle from "../view-toggle";
import type { LayoutKey } from "@/components/layouts";
import { PaginationDisplay } from "@/components/shared/pagination-display";

interface SharedCardHeaderProps {
  searchTerm: string;
  selectedTags: string[];
  selectedTag: string | null;
  sortBy: SortOption;
  filteredCount: number;
  totalCount: number;
  isInfinite: boolean;
  start: number;
  hasActiveFilters: boolean;
  config: CardConfigOptions;
  tags: Tag[];
  headerActions?: React.ReactNode;
  layoutKey?: LayoutKey;
  onViewChange?: (view: LayoutKey) => void;
  isMapAvailable?: boolean;
  isMapActive?: boolean;
  onMapToggle?: () => void;
}

const filterStatsClasses = 'flex items-center gap-4';
const filterTextClasses = 'text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300';
const filterBadgeClasses = 'flex items-center gap-2 text-xs';
const filterIconClasses = 'w-3 h-3 text-theme-primary-500 dark:text-theme-primary-400';
const filterLabelClasses = 'text-theme-primary-500 dark:text-theme-primary-400 font-medium';
const headerTitleClasses = 'text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300';
const activeFilterBadgeClasses ='px-2 py-1 bg-theme-primary-10 dark:bg-theme-primary-900/30 text-white rounded-sm text-xs';
const emptyStateContainerClasses = 'text-center py-8 sm:py-10';
const emptyStateIconWrapperClasses ='w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-white/[0.05] rounded-full flex items-center justify-center transition-colors duration-300';
const emptyStateIconClasses = 'w-8 h-8 text-gray-400 dark:text-gray-500';
const emptyStateTitleClasses = 'text-lg font-medium text-gray-900 dark:text-white mb-2 transition-colors duration-300';
const emptyStateDescriptionClasses = 'text-gray-600 dark:text-gray-400 mb-4 transition-colors duration-300';


/**
 * FilterStats - Display filter statistics
 */
export function FilterStats({
  filteredCount,
  totalCount,
  searchTerm,
  selectedTags,
  hasActiveFilters,
  t,
  className = "",
}: {
  filteredCount: number;
  totalCount: number;
  searchTerm: string;
  selectedTags: string[];
  hasActiveFilters: boolean;
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  return (
    <div className={clsx(filterStatsClasses, className)}>
      <div className={filterTextClasses}>
        {hasActiveFilters
          ? t("FILTER_STATUS_MATCH_ALL", { filtered: filteredCount, total: totalCount })
          : t("FILTER_STATUS", { filtered: filteredCount, total: totalCount })}
      </div>

      {(searchTerm || selectedTags.length > 0) && (
        <div className={filterBadgeClasses}>
          <Filter className={filterIconClasses} />
          <span className={filterLabelClasses}>
            {searchTerm && t("SEARCH")}
            {searchTerm && selectedTags.length > 0 && " + "}
            {selectedTags.length > 0 &&
              `${selectedTags.length} ${
                selectedTags.length > 1 ? t("TAG_PLURAL") : t("TAG")
              }`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ActiveFiltersDisplay - Display active filters as badges
 */
export function ActiveFiltersDisplay({
  searchTerm,
  selectedTags,
  tags,
  t,
  className = "",
}: {
  searchTerm: string;
  selectedTags: string[];
  tags: Tag[];
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  if (!searchTerm && selectedTags.length === 0) return null;

  return (
    <div className={clsx("flex flex-col items-center gap-2 mt-4", className)}>
      <p className={filterTextClasses}>
        {t("ACTIVE_FILTERS")}
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {searchTerm && (
          <span className={activeFilterBadgeClasses}>
            {t("SEARCH_COLON")} &quot;{searchTerm}&quot;
          </span>
        )}
        {selectedTags.map((tagId: string) => {
          const tagName = getTagName(tagId, tags);
          return tagName ? (
            <span
              key={tagId}
              className={activeFilterBadgeClasses}
            >
              {t("TAG_COLON")} {tagName}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}

/**
 * EmptyState - Display when no items are found
 */
export function EmptyState({
  searchTerm,
  selectedTags,
  selectedTag,
  tags,
  t,
  customMessage,
  customDescription,
  className = "",
}: {
  searchTerm: string;
  selectedTags: string[];
  selectedTag: string | null;
  tags: Tag[];
  t: ReturnType<typeof useTranslations>;
  customMessage?: string;
  customDescription?: string;
  className?: string;
}) {
  const hasFilters = searchTerm || selectedTags.length > 0 || selectedTag;

  return (
    <div className={clsx(emptyStateContainerClasses, className)}>
      <div className={emptyStateIconWrapperClasses}>
        <Search className={emptyStateIconClasses} />
      </div>
      <h3 className={emptyStateTitleClasses}>
        {customMessage || t("NO_ITEMS_FOUND")}
      </h3>
      <p className={emptyStateDescriptionClasses}>
        {customDescription ||
          (hasFilters ? t("TRY_ADJUSTING_FILTERS") : t("NO_ITEMS_IN_CATEGORY"))}
      </p>
      <ActiveFiltersDisplay
        searchTerm={searchTerm}
        selectedTags={selectedTags}
        tags={tags}
        t={t}
      />
    </div>
  );
}

/**
 * ResultsHeader - Display results header with sorting info
 */
export function ResultsHeader({
  searchTerm,
  selectedTags,
  t,
  className = "",
}: {
  searchTerm: string;
  selectedTags: string[];
  t: ReturnType<typeof useTranslations>;
  className?: string;
}) {
  const getHeaderTitle = useCallback((): string => {
    if (searchTerm) return t("SEARCH_RESULTS");
    if (selectedTags.length > 0) return t("TAGGED_ITEMS");
    return t("FEATURED_ITEMS");
  }, [searchTerm, selectedTags, t]);

  return (
    <div className={clsx("flex items-center justify-between", className)}>
      <h2 className={headerTitleClasses}>
        {getHeaderTitle()}
      </h2>
    </div>
  );
}

/**
 * SharedCardHeader - Main header component orchestrating all header elements
 */
export function SharedCardHeader(props: SharedCardHeaderProps) {
  const { config, headerActions, layoutKey, onViewChange, isMapAvailable, isMapActive, onMapToggle } = props;
  const t = useTranslations("listing");

  const currentPage = Math.floor(props.start / (config.perPage || PER_PAGE));
  const perPage = config.perPage || PER_PAGE;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          {config.showStats && (
            <PaginationDisplay
              totalCount={props.totalCount}
              filteredCount={props.filteredCount}
              currentPage={currentPage}
              perPage={perPage}
              hasActiveFilters={props.hasActiveFilters}
              isInfinite={props.isInfinite}
              sortBy={props.sortBy}
            />
          )}
          {(props.searchTerm || props.selectedTags.length > 0) && (
            <div className={filterBadgeClasses}>
              <Filter className={filterIconClasses} />
              <span className={filterLabelClasses}>
                {props.searchTerm && t("SEARCH")}
                {props.searchTerm && props.selectedTags.length > 0 && " + "}
                {props.selectedTags.length > 0 &&
                  `${props.selectedTags.length} ${
                    props.selectedTags.length > 1 ? t("TAG_PLURAL") : t("TAG")
                  }`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {headerActions}
          {config.showViewToggle && layoutKey && onViewChange && (
            <ViewToggle
              activeView={layoutKey}
              onViewChange={onViewChange}
              isMapAvailable={isMapAvailable}
              isMapActive={isMapActive}
              onMapToggle={onMapToggle}
            />
          )}
        </div>
      </div>

      {config.showFilters && (
        <ResultsHeader
          searchTerm={props.searchTerm}
          selectedTags={props.selectedTags}
          t={t}
          className="mb-6"
        />
      )}
    </>
  );
}
