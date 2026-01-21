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
	contentWrapperFluid: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-3 lg:gap-3 xl:gap-4',
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
	const { selectedCategories, searchTerm, selectedTags, isFiltersLoading } =
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

	// Filtering logic using shared utility
	// Uses items with engagement data for true popularity sorting
	const filteredItems = useMemo(() => {
		const filtered = filterItems(itemsWithEngagement, {
			searchTerm,
			selectedTags,
			selectedCategories
		});

		// Sort items with featured items first (popularity sorting uses engagement data)
		return sortItemsWithFeatured(filtered, featuredItems);
	}, [itemsWithEngagement, searchTerm, selectedTags, selectedCategories, featuredItems]);

	// Note: URL parsing is handled by FilterURLParser in the Listing component
	// No need to duplicate that logic here
	// IMPORTANT: This file should NOT parse URL params - FilterURLParser handles that

	// Get container width to conditionally apply styles
	const containerWidth = useContainerWidth();
	const isFluid = containerWidth === 'fluid';

	// Combined loading state
	const isLoading = isFiltersLoading || isEngagementLoading;

	if (layoutHome === LayoutHome.HOME_ONE) {
		return (
			<SponsorAdsProvider limit={10}>
				<TopLoadingBar isLoading={isLoading} />
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

						{/* Listing Content */}
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
									enableSorting: true,
								}}
							/>
						</div>
					</div>
				</div>
			</Container>
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
			</div>
		</SponsorAdsProvider>
	);
}
