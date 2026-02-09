'use client';
import { LayoutHome, useLayoutTheme } from '@/components/context';
import { Categories } from '@/components/filters/components/categories/categories-section';
import { Tags } from '@/components/filters/components/tags/tags-section';
import { Tag, Category, ItemData } from '@/lib/content';
import { sortByNumericProperty, filterItems } from '@/lib/utils';
import { HomeTwoLayout } from '@/components/home-two';
import { ListingClient } from '@/components/shared-card/listing-client';
import { useFilters } from '@/hooks/use-filters';
import { useMemo } from 'react';
import { sortItemsWithFeatured } from '@/lib/utils/featured-items';
import { useFeaturedItemsSection } from '@/hooks/use-feature-items-section';
import { useItemEngagement } from '@/hooks/use-item-engagement';
import { TopLoadingBar } from '@/components/ui/top-loading-bar';
import { Container, useContainerWidth } from '@/components/ui/container';
import { SponsorAdsProvider } from '@/components/sponsor-ads';
import { LocationFilter } from '@/components/filters/components/location';
import { useLocationItems } from '@/hooks/use-location-items';
import { LocationDistanceProvider } from '@/components/filters/context/location-distance-context';
import DecorativeBg from '@/components/shared/decorative-bg';

type ListingProps = {
	total: number;
	start: number;
	page: number;
	basePath: string;
	categories: Category[];
	tags: Tag[];
	items: ItemData[];
	searchEnabled?: boolean;
	defaultView?: string;
};

const LAYOUT_STYLES = {
	mobileOnly: 'lg:hidden z-10',
	desktopOnly: 'hidden lg:block z-10',
	tabletUp: 'hidden md:block',
	mobileDown: 'lg:hidden',
	largeUp: 'hidden xl:block',
	mainContainer: 'pb-8 sm:pb-10 md:pb-12 lg:pb-16 xl:pb-20',
	contentWrapper: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-5',
	contentWrapperFluid: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-2 lg:gap-0 xl:gap-0',
	sidebar: 'lg:sticky lg:top-4 lg:self-start lg:w-64 lg:flex-shrink-0',
	sidebarFluid: 'lg:sticky lg:top-4 lg:self-start lg:w-80 xl:w-[340px] 2xl:w-[380px] lg:flex-shrink-0',
	sidebarMobile: 'mb-3 sm:mb-4 md:mb-5 lg:mb-0',
	mainContent: 'w-full flex-1 min-w-0',
	pagination: 'flex items-center justify-center mt-6 sm:mt-8 md:mt-10 lg:mt-12',
	sectionGap: 'gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7',
	itemGap: 'gap-2 sm:gap-3 md:gap-4 lg:gap-5'
};

export default function GlobalsClient(props: ListingProps) {
	// Destructure paginationType to subscribe to context changes - forces re-render when pagination type changes
	const { layoutHome = LayoutHome.HOME_ONE, paginationType } = useLayoutTheme();
	const { selectedCategories, searchTerm, selectedTags, isFiltersLoading, locationFilter } =
		useFilters();
	const sortedTags = sortByNumericProperty(props.tags);
	const sortedCategories = sortByNumericProperty(props.categories);

	// Use the new hook for featured items
	const { featuredItems } = useFeaturedItemsSection({
		limit: 6,
		enabled: true
	});

	// Fetch engagement metrics for popularity sorting
	// This enriches items with views, votes, favorites, comments data
	const { items: itemsWithEngagement, isLoading: isEngagementLoading } = useItemEngagement(props.items);

	// Location-based filtering via API
	const { matchingSlugs, distances, isLoading: isLocationLoading } = useLocationItems(locationFilter);

	// Filtering logic using shared utility
	// Uses items with engagement data for true popularity sorting
	const filteredItems = useMemo(() => {
		let filtered = filterItems(itemsWithEngagement, {
			searchTerm,
			selectedTags,
			selectedCategories
		});

		// Apply location filter: intersect with matching slugs from API
		if (matchingSlugs !== null) {
			filtered = filtered.filter(item => matchingSlugs.has(item.slug));
		}

		// When sorting by distance, sort by distance instead of featured/popularity
		if (locationFilter.sortByDistance && distances.size > 0) {
			return filtered.sort((a, b) => {
				const distA = distances.get(a.slug) ?? Infinity;
				const distB = distances.get(b.slug) ?? Infinity;
				return distA - distB;
			});
		}

		// Sort items with featured items first (popularity sorting uses engagement data)
		return sortItemsWithFeatured(filtered, featuredItems);
	}, [itemsWithEngagement, searchTerm, selectedTags, selectedCategories, featuredItems, matchingSlugs, distances, locationFilter.sortByDistance]);

	// Note: URL parsing is handled by FilterURLParser in the Listing component
	// No need to duplicate that logic here
	// IMPORTANT: This file should NOT parse URL params - FilterURLParser handles that

	// Get container width to conditionally apply styles
	const containerWidth = useContainerWidth();
	const isFluid = containerWidth === 'fluid';

	// Combined loading state
	const isLoading = isFiltersLoading || isEngagementLoading || isLocationLoading;

	if (layoutHome === LayoutHome.HOME_ONE) {
		return (
			<SponsorAdsProvider limit={10}>
				<TopLoadingBar isLoading={isLoading} />
				<div>
				<Container maxWidth="7xl" padding="default" useGlobalWidth className={LAYOUT_STYLES.mainContainer}>
				{/* Featured Items Section - Only show on first page and desktop */}
				{/* {page === 1 && featuredItems.length > 0 && (
          <div className={`mb-8 sm:mb-10 md:mb-12 lg:mb-16 ${LAYOUT_STYLES.desktopOnly}`}>
            <FeaturedItemsSection
              className="mb-12"
              title="Featured Items"
              description="Discover our handpicked selection of top-rated tools and resources"
              limit={6}
              variant="hero"
            />
          </div>
        )} */}

				<div className={isFluid ? LAYOUT_STYLES.contentWrapperFluid : LAYOUT_STYLES.contentWrapper}>
					{/* Sidebar - Categories */}
					{sortedCategories.length > 0 && (
						<div className={`${isFluid ? LAYOUT_STYLES.sidebarFluid : LAYOUT_STYLES.sidebar} ${LAYOUT_STYLES.sidebarMobile}`}>
							<Categories total={props.total} categories={sortedCategories} tags={sortedTags} />
						</div>
					)}

					{/* Main Content */}
					<div className={LAYOUT_STYLES.mainContent}>
						{/* Tags Section - Mobile version - Only show if tags exist */}
						{sortedTags.length > 0 && (
							<div className={` lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-8 ${LAYOUT_STYLES.mobileOnly}`}>
								<Tags tags={sortedTags} enableSticky={false} maxVisibleTags={3} allItems={props.items} />
							</div>
						)}
						{/* Tags Section - Desktop version - Only show if tags exist */}
						{sortedTags.length > 0 && (
							<div className={`lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-8 ${LAYOUT_STYLES.desktopOnly}`}>
								<Tags tags={sortedTags} enableSticky={true} maxVisibleTags={isFluid ? 8 : 5} allItems={props.items} />
							</div>
						)}

						{/* Location Filters */}
						<div className="mb-4 sm:mb-6">
							<LocationFilter />
						</div>

						{/* Listing Content */}
						<LocationDistanceProvider distances={distances}>
							<div className="mb-6 sm:mb-8 md:mb-10">
								<ListingClient
									{...props}
									items={filteredItems}
									totalCount={props.items.length}
									config={{
										showStats: false,
										showViewToggle: true,
										showFilters: false,
										showPagination: true,
										showEmptyState: true,
										enableSearch: false,
										enableTagFilter: false,
										enableSorting: !(locationFilter.sortByDistance && distances.size > 0),
									}}
								/>
							</div>
						</LocationDistanceProvider>
					</div>
				</div>
			</Container>
			<DecorativeBg />
			</div>
			</SponsorAdsProvider>
		);
	}

	return (
		<SponsorAdsProvider limit={10}>
			<TopLoadingBar isLoading={isLoading} />
			<div className={LAYOUT_STYLES.mainContainer}>
				<HomeTwoLayout
					{...props}
					categories={sortedCategories}
					tags={sortedTags}
					filteredAndSortedItems={filteredItems}
					searchEnabled={props.searchEnabled}
				/>
				<DecorativeBg />
			</div>
		</SponsorAdsProvider>
	);
}
