"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Collection } from "@/types/collection";
import { ItemData, Tag } from "@/lib/content";
import { Container, useContainerWidth } from "@/components/ui/container";
import { ListingClient } from "@/components/shared-card/listing-client";
import { FilterProvider } from "@/components/filters/context/filter-context";
import { Tags } from "@/components/filters/components/tags/tags-section";
import { sortByNumericProperty, filterItems } from "@/lib/utils";
import { useFilters } from "@/hooks/use-filters";
import { TopLoadingBar } from "@/components/ui/top-loading-bar";
import Hero from "@/components/hero";
import { LayoutHome, useLayoutTheme } from "@/components/context";
import { HomeTwoSortSelector, HomeTwoTagsSelector } from "@/components/home-two";
import { SortControl } from "@/components/filters/components/controls/sort-control";
import { SortOption } from "@/components/filters/types";
import { LayoutSettings } from "@/components/layout-settings";
import { CardPresets } from "@/components/shared-card";
import { sortItems } from "@/components/shared-card/utils/sort-utils";
import { SearchInput } from "@/components/ui/search-input";
import { useStickyState } from "@/hooks/use-sticky-state";

const COLLECTION_SORT_OPTIONS: SortOption[] = [
  "popularity",
  "name-asc",
  "name-desc",
  "date-desc",
  "date-asc",
];

interface CollectionDetailProps {
  collection: Collection;
  tags: Tag[];
  items: ItemData[];
  total: number;
  start: number;
  page: number;
  basePath: string;
}

const LAYOUT_STYLES = {
  mobileOnly: 'lg:hidden z-10',
  desktopOnly: 'hidden lg:block z-10',
  mainContainer: 'pb-8 sm:pb-10 md:pb-12 lg:pb-16 xl:pb-20',
  contentWrapper: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-5',
  contentWrapperFluid: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-3 lg:gap-3 xl:gap-4',
  sidebar: 'lg:sticky lg:top-4 lg:self-start lg:w-64 lg:flex-shrink-0',
  sidebarFluid: 'lg:sticky lg:top-4 lg:self-start lg:w-80 xl:w-[340px] 2xl:w-[380px] lg:flex-shrink-0',
  sidebarMobile: 'mb-3 sm:mb-4 md:mb-5 lg:mb-0',
  mainContent: 'w-full flex-1 min-w-0',
};

// Sticky container styles reused from the default Home Two layout
const STICKY_CONTAINER_BASE = "sticky top-12 z-20 transition-[background-color,box-shadow,border-color] duration-200 ease-in-out rounded-lg";
const STICKY_CONTAINER_ACTIVE = `${STICKY_CONTAINER_BASE} bg-white/95 dark:bg-gray-800/95 shadow-md backdrop-blur-xs border border-gray-100 dark:border-gray-700/50 px-4 py-3`;
const STICKY_CONTAINER_INACTIVE = `${STICKY_CONTAINER_BASE} bg-transparent`;

// Filter layout styles adapted from HomeTwoFilters without categories
const FILTERS_CONTAINER = "space-y-3 sm:space-y-4";
const MOBILE_FILTERS = "block sm:hidden space-y-3";
const TABLET_FILTERS = "hidden sm:block md:hidden";
const DESKTOP_FILTERS = "hidden md:flex justify-between items-center gap-4";
const FILTERS_GROUP = "flex items-center gap-3";

type CollectionHeroProps = {
  badgeText: string;
  collection: Collection;
  description: string;
  isLongDescription: boolean;
  isDescriptionExpanded: boolean;
  onToggleDescription: () => void;
  iconClassName: string;
  showMoreLabel: string;
  showLessLabel: string;
  children: ReactNode;
};

function CollectionHero(props: CollectionHeroProps) {
  const {
    badgeText,
    collection,
    description,
    isLongDescription,
    isDescriptionExpanded,
    onToggleDescription,
    iconClassName,
    showMoreLabel,
    showLessLabel,
    children,
  } = props;
  return (
    <Hero
      badgeText={badgeText}
      title={
        <div className="flex flex-col items-center gap-4">
          {collection.icon_url && (
            <div className={iconClassName}>{collection.icon_url}</div>
          )}
          <span className="bg-linear-to-r from-theme-primary via-purple-500 to-theme-primary bg-clip-text text-transparent inline-block leading-tight">
            {collection.name}
          </span>
        </div>
      }
      description={
        <>
          <span className="text-gray-600 dark:text-gray-400 text-lg block">
            {description}
          </span>
          {isLongDescription && (
            <button
              onClick={onToggleDescription}
              className="mt-2 inline-flex text-theme-primary hover:text-theme-primary/80 text-sm font-medium transition-colors duration-200"
            >
              {isDescriptionExpanded ? showLessLabel : showMoreLabel}
            </button>
          )}
        </>
      }
      className="min-h-screen text-center"
    >
      {children}
    </Hero>
  );
}

type CollectionHomeTwoFiltersProps = {
  tags: Tag[];
  totalCount?: number;
  filteredCount?: number;
  searchEnabled?: boolean;
};

function CollectionHomeTwoFilters({ tags, totalCount, filteredCount, searchEnabled = true }: CollectionHomeTwoFiltersProps) {
  const t = useTranslations('listing');
  const {
    searchTerm,
    setSearchTerm,
    setSortBy,
    sortBy,
    selectedTags,
    toggleSelectedTag,
  } = useFilters();

  const handleTagToggle = (tagId: string) => {
    toggleSelectedTag(tagId);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const handleSortChange = (sort: string) => {
    if (COLLECTION_SORT_OPTIONS.includes(sort as SortOption)) {
      setSortBy(sort as SortOption);
    }
  };

  const renderSortAndTags = () => (
    <div className={FILTERS_GROUP}>
      <HomeTwoSortSelector setSortBy={handleSortChange} sortBy={sortBy} />
      <HomeTwoTagsSelector
        tags={tags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
      />
    </div>
  );

  return (
    <div className={FILTERS_CONTAINER}>
      <div className={MOBILE_FILTERS}>
        {searchEnabled && (
          <div className="w-full">
            <SearchInput
              searchTerm={searchTerm}
              setSearchTerm={handleSearchChange}
              className="w-full"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">{renderSortAndTags()}</div>
          <LayoutSettings />
        </div>
      </div>

      <div className={TABLET_FILTERS}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {renderSortAndTags()}
            <LayoutSettings />
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

      <div className={DESKTOP_FILTERS}>
        {renderSortAndTags()}

        <div className={FILTERS_GROUP}>
          {searchEnabled && (
            <div className="w-64 lg:w-80 xl:w-96">
              <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={handleSearchChange}
              />
            </div>
          )}
          <LayoutSettings />
        </div>
      </div>

      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredCount !== undefined && totalCount !== undefined ? (
            filteredCount === totalCount ? (
              <span>{t('SHOWING_TOTAL_ITEMS', { total: totalCount })}</span>
            ) : (
              <span>{t('FILTER_STATUS', { filtered: filteredCount, total: totalCount })}</span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

type CollectionHomeTwoLayoutProps = CollectionDetailProps & {
  tags: Tag[];
  filteredItems: ItemData[];
  searchEnabled?: boolean;
};

function CollectionHomeTwoLayout({
  total,
  start,
  page,
  basePath,
  tags,
  items,
  filteredItems,
  searchEnabled = true,
}: CollectionHomeTwoLayoutProps) {
  const { itemsPerPage } = useLayoutTheme();
  const { isSticky, sentinelRef, targetRef } = useStickyState({
    threshold: 0,
    rootMargin: "-20px 0px 0px 0px",
  });

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Container maxWidth="7xl" padding="default" useGlobalWidth className="flex flex-col gap-4 py-8">
        <div ref={sentinelRef} className="md:h-4 md:w-full" />
        <div
          ref={targetRef}
          className={isSticky ? STICKY_CONTAINER_ACTIVE : STICKY_CONTAINER_INACTIVE}
        >
          <CollectionHomeTwoFilters
            tags={tags}
            totalCount={items.length}
            filteredCount={filteredItems.length}
            searchEnabled={searchEnabled}
          />
        </div>
        <ListingClient
          total={total}
          start={start}
          page={page}
          basePath={basePath}
          categories={[]}
          tags={tags}
          items={filteredItems}
          config={{
            ...CardPresets.homeTwoListing,
            perPage: itemsPerPage,
            customEmptyMessage: 'No items found in this collection',
            customEmptyDescription: 'No items in this collection match the current search or tag filters.',
          }}
        />
      </Container>
    </div>
  );
}

function CollectionDetailContent(props: CollectionDetailProps) {
  const { collection, tags, items } = props;
  const t = useTranslations();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { layoutHome = LayoutHome.HOME_ONE } = useLayoutTheme();
  const { searchTerm, selectedTags, isFiltersLoading, sortBy, setSortBy } = useFilters();
  
  const sortedTags = sortByNumericProperty(tags);

  // Filtering logic using shared utility
  const filteredItems = useMemo(() => {
    const filtered = filterItems(items, {
      searchTerm,
      selectedTags
    });
    const sorted = sortItems(filtered, sortBy);

    return sorted;
  }, [items, searchTerm, selectedTags, sortBy]);

  // Get container width to conditionally apply styles
  const containerWidth = useContainerWidth();
  const isFluid = containerWidth === 'fluid';

  const descriptionText = collection.description ?? "";
  const isLongDescription = descriptionText.length > 200;
  const displayDescription = isDescriptionExpanded || !isLongDescription
    ? descriptionText
    : descriptionText.slice(0, 200) + "...";

  // Render HOME_TWO layout if selected
  if (layoutHome === LayoutHome.HOME_TWO) {
    return (
      <>
        <TopLoadingBar isLoading={isFiltersLoading} />
        <CollectionHero
          badgeText={t("common.COLLECTION")}
          collection={collection}
          description={displayDescription}
          isLongDescription={isLongDescription}
          isDescriptionExpanded={isDescriptionExpanded}
          onToggleDescription={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          iconClassName="text-4xl text-gray-900 dark:text-white"
          showMoreLabel={t("common.SHOW_MORE", { count: "" })}
          showLessLabel={t("common.SHOW_LESS")}
        >
          <div className="pb-8 sm:pb-10 md:pb-12 lg:pb-16 xl:pb-20">
            <CollectionHomeTwoLayout
              {...props}
              tags={sortedTags}
              filteredItems={filteredItems}
              searchEnabled={true}
            />
          </div>
        </CollectionHero>
      </>
    );
  }

  // HOME_ONE layout (default)
  return (
    <>
      <TopLoadingBar isLoading={isFiltersLoading} />
      <CollectionHero
        badgeText={t("common.COLLECTION")}
        collection={collection}
        description={displayDescription}
        isLongDescription={isLongDescription}
        isDescriptionExpanded={isDescriptionExpanded}
        onToggleDescription={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
        iconClassName="text-5xl text-gray-900 dark:text-white"
        showMoreLabel={t("common.SHOW_MORE", { count: "" })}
        showLessLabel={t("common.SHOW_LESS")}
      >
        <Container maxWidth="7xl" padding="default" useGlobalWidth className="py-0 mt-0">
          <div className={LAYOUT_STYLES.mainContainer}>
            <div className="w-full">
              {/* Tags Section - Mobile version */}
              {sortedTags.length > 0 && (
                <div className={`lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-8 ${LAYOUT_STYLES.mobileOnly}`}>
                  <Tags tags={sortedTags} enableSticky={false} maxVisibleTags={3} allItems={props.items} />
                </div>
              )}
              {/* Tags Section - Desktop version */}
              {sortedTags.length > 0 && (
                <div className={`lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-8 ${LAYOUT_STYLES.desktopOnly}`}>
                  <Tags tags={sortedTags} enableSticky={true} maxVisibleTags={isFluid ? 8 : 5} allItems={props.items} />
                </div>
              )}

              {/* Listing Content */}
              <div className="mb-6 sm:mb-8 md:mb-10 space-y-10">
                <div className="flex w-full flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 md:-mb-8">
                  <SortControl
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    className="w-full md:w-32 sm:w-auto max-w-full sm:max-w-40"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {filteredItems.length === props.items.length
                      ? t('listing.SHOWING_TOTAL_ITEMS', { total: props.items.length })
                      : t('listing.FILTER_STATUS', { filtered: filteredItems.length, total: props.items.length })}
                  </span>
                </div>
                <ListingClient
                  {...props}
                  categories={[]}
                  items={filteredItems}
                  totalCount={props.items.length}
                  config={{
                    showStats: false,
                    showViewToggle: true,
                    showFilters: false,
                    showPagination: true,
                    showEmptyState: true,
                    enableSearch: true,
                    enableTagFilter: false,
                    enableSorting: true,
                    customEmptyMessage: 'No items found in this collection',
                    customEmptyDescription: 'No items in this collection match the current search or tag filters.',
                  }}
                />
              </div>
            </div>
          </div>
        </Container>
      </CollectionHero>
    </>
  );
}

export function CollectionDetail(props: CollectionDetailProps) {
  return (
    <FilterProvider initialSortBy="name-asc">
      <CollectionDetailContent {...props} />
    </FilterProvider>
  );
}
