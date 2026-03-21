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
import { SORT_OPTIONS } from '@/components/filters/constants';
import { applyFeaturedFlags } from '@/lib/utils/featured-items';
import { useFeaturedItemsSection } from '@/hooks/use-feature-items-section';
import { useItemEngagement } from '@/hooks/use-item-engagement';
import { TopLoadingBar } from '@/components/ui/top-loading-bar';
import { Container, useContainerWidth } from '@/components/ui/container';
import { LocationFilter } from '@/components/filters/components/location';
import { useLocationItems } from '@/hooks/use-location-items';
import { LocationDistanceProvider } from '@/components/filters/context/location-distance-context';
import DecorativeBg from '@/components/shared/decorative-bg';
import { ExportButton } from '@/components/shared/export-button';

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
	contentWrapper: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 pt-[30px] md:gap-4 lg:gap-4 xl:gap-5',
	contentWrapperFluid: 'flex flex-col lg:flex-row w-full gap-2 sm:gap-3 md:gap-2 lg:gap-0 xl:gap-0',
	sidebar: 'lg:sticky lg:top-4 lg:self-start lg:w-64 lg:flex-shrink-0',
	sidebarFluid: 'lg:sticky lg:top-4 lg:self-start lg:w-68 lg:flex-shrink-0',
	sidebarMobile: 'mb-3 sm:mb-4 md:mb-5 lg:mb-0',
	mainContent: 'w-full flex-1 min-w-0',
	pagination: 'flex items-center justify-center mt-6 sm:mt-8 md:mt-10 lg:mt-12',
	sectionGap: 'gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7',
	itemGap: 'gap-2 sm:gap-3 md:gap-4 lg:gap-5'
};

export default function GlobalsClient(props: ListingProps) {
	const { layoutHome = LayoutHome.HOME_ONE, paginationType: _paginationType } = useLayoutTheme();
	const { selectedCategories, searchTerm, selectedTags, sortBy, isFiltersLoading, locationFilter } = useFilters();
	const sortedTags = useMemo(() => sortByNumericProperty(props.tags), [props.tags]);
	const sortedCategories = useMemo(() => sortByNumericProperty(props.categories), [props.categories]);
	const shouldLoadPopularityData = sortBy === SORT_OPTIONS.POPULARITY && !locationFilter.sortByDistance;

	const { featuredItems } = useFeaturedItemsSection({
		limit: 6,
		enabled: shouldLoadPopularityData
	});

	const { items: itemsWithEngagement, isLoading: isEngagementLoading } = useItemEngagement(props.items, {
		enabled: shouldLoadPopularityData
	});

	const { matchingSlugs, distances, isLoading: isLocationLoading } = useLocationItems(locationFilter);

	const filteredItems = useMemo(() => {
		let filtered = filterItems(itemsWithEngagement, {
			searchTerm,
			selectedTags,
			selectedCategories
		});

		if (matchingSlugs !== null) {
			filtered = filtered.filter((item) => matchingSlugs.has(item.slug));
		}

		if (locationFilter.sortByDistance && distances.size > 0) {
			return filtered.sort((a, b) => {
				const distA = distances.get(a.slug) ?? Infinity;
				const distB = distances.get(b.slug) ?? Infinity;
				return distA - distB;
			});
		}

		return featuredItems.length > 0 ? applyFeaturedFlags(filtered, featuredItems) : filtered;
	}, [
		itemsWithEngagement,
		searchTerm,
		selectedTags,
		selectedCategories,
		featuredItems,
		matchingSlugs,
		distances,
		locationFilter.sortByDistance
	]);

	const containerWidth = useContainerWidth();
	const isFluid = containerWidth === 'fluid';
	const isLoading = isFiltersLoading || isLocationLoading || (shouldLoadPopularityData && isEngagementLoading);

	const listingConfig = useMemo(
		() => ({
			showStats: false,
			showViewToggle: true,
			showFilters: false,
			showPagination: true,
			showEmptyState: true,
			enableSearch: false,
			enableTagFilter: false,
			enableSorting: !(locationFilter.sortByDistance && distances.size > 0)
		}),
		[locationFilter.sortByDistance, distances.size]
	);

	if (layoutHome === LayoutHome.HOME_ONE) {
		return (
			<>
				<TopLoadingBar isLoading={isLoading} />
				<DecorativeBg reverse />
				<Container maxWidth="7xl" padding="default" useGlobalWidth className={LAYOUT_STYLES.mainContainer}>
					<div className={isFluid ? LAYOUT_STYLES.contentWrapperFluid : LAYOUT_STYLES.contentWrapper}>
						{sortedCategories.length > 0 && (
							<div
								className={`${isFluid ? LAYOUT_STYLES.sidebarFluid : LAYOUT_STYLES.sidebar} ${LAYOUT_STYLES.sidebarMobile}`}
							>
								<Categories total={props.total} categories={sortedCategories} tags={sortedTags} />
							</div>
						)}

						<div data-filter-scroll-target className={LAYOUT_STYLES.mainContent}>
							{sortedTags.length > 0 && (
								<div className={` lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-8 ${LAYOUT_STYLES.mobileOnly}`}>
									<Tags
										tags={sortedTags}
										enableSticky={false}
										maxVisibleTags={3}
										allItems={props.items}
									/>
								</div>
							)}
							{sortedTags.length > 0 && (
								<div className={`lg:sticky lg:top-4 mb-4 sm:mb-6 md:mb-4 ${LAYOUT_STYLES.desktopOnly}`}>
									<Tags
										tags={sortedTags}
										enableSticky={true}
										maxVisibleTags={isFluid ? 8 : 5}
										allItems={props.items}
									/>
								</div>
							)}

							<div className="mb-4 sm:mb-6">
								<LocationFilter />
							</div>

							<LocationDistanceProvider distances={distances}>
								<div className="mb-6 sm:mb-8 md:mb-10">
									<ListingClient
										{...props}
										items={filteredItems}
										totalCount={props.items.length}
										config={listingConfig}
										headerActions={<ExportButton />}
									/>
								</div>
							</LocationDistanceProvider>
						</div>
					</div>
				</Container>
				<DecorativeBg />
			</>
		);
	}

	return (
		<>
			<TopLoadingBar isLoading={isLoading} />
			<div data-filter-scroll-target className={LAYOUT_STYLES.mainContainer}>
				<DecorativeBg reverse />
				<HomeTwoLayout
					{...props}
					categories={sortedCategories}
					tags={sortedTags}
					filteredAndSortedItems={filteredItems}
					searchEnabled={props.searchEnabled}
				/>
			</div>
			<DecorativeBg />
		</>
	);
}
