'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { clampAndScrollToTop } from '@/utils/pagination';
import { useFavorites } from '@/hooks/use-favorites';
import { useTranslations } from 'next-intl';
import { Heart, Star, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Category, ItemData, Tag } from '@/lib/content';
import Item from '../item';
import { useCurrentUser } from '@/hooks/use-current-user';
import { layoutComponents, LayoutKey } from '../layouts';
import { UniversalPagination } from '../universal-pagination';
import SortMenu from '../sort-menu';
import { sortItems } from '../shared-card/utils/sort-utils';
import type { SortOption } from '../filters/types';
import ViewToggle from '../view-toggle';
import { useLayoutTheme } from '@/components/context';

type ListingProps = {
	total: number;
	basePath: string;
	categories: Category[];
	tags: Tag[];
	items: ItemData[];
};

// Sort options for the popular items section
const POPULAR_ITEMS_SORT_OPTIONS = [
	{ value: 'popularity', label: 'POPULARITY' },
	{ value: 'name-asc', label: 'NAME_A_Z' },
	{ value: 'name-desc', label: 'NAME_Z_A' },
	{ value: 'date-asc', label: 'OLDEST' }
];

export function FavoritesClient(props: ListingProps) {
	const { user } = useCurrentUser();
	const { favorites, isLoading, error } = useFavorites();
	const t = useTranslations('common');
	const tListing = useTranslations('listing');

	// Layout switching - reuse the same layout context as Home page
	const { layoutKey, setLayoutKey } = useLayoutTheme();
	const LayoutComponent = layoutComponents[layoutKey];

	// Handle view change
	const handleViewChange = useCallback(
		(newView: LayoutKey) => setLayoutKey(newView),
		[setLayoutKey]
	);

	// Filter items to only show favorites
	const favoriteItems = useMemo(
		() => props.items.filter((item) => favorites.some((fav) => fav.itemSlug === item.slug)),
		[props.items, favorites]
	);

	// Get favorited item slugs for exclusion
	const favoritedSlugs = useMemo(
		() => new Set(favorites.map((fav) => fav.itemSlug)),
		[favorites]
	);

	// Carousel items should EXCLUDE favorited items
	const carouselItems = useMemo(
		() => props.items.filter((item) => !favoritedSlugs.has(item.slug)),
		[props.items, favoritedSlugs]
	);

	// Pagination state for favorites
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 12;

	// Sort state for favorites
	const [favoritesSortBy, setFavoritesSortBy] = useState<SortOption>('popularity');

	// Sort state for popular items (when no favorites)
	const [popularSortBy, setPopularSortBy] = useState<SortOption>('popularity');
	const [popularPage, setPopularPage] = useState(1);
	const popularItemsPerPage = 12;

	// Carousel state for recommendations
	const [carouselPosition, setCarouselPosition] = useState(0);
	const carouselRef = useRef<HTMLDivElement>(null);
	const carouselItemWidth = 344; // w-80 (320px) + gap-6 (24px) = 344px
	const carouselItemsToShow = 4;
	const carouselItemsTotal = Math.min(carouselItems.length, 12); // Max items to display in carousel

	// Sort favorites
	const sortedFavoriteItems = useMemo(
		() => sortItems(favoriteItems, favoritesSortBy),
		[favoriteItems, favoritesSortBy]
	);

	// Calculate pagination for favorites
	const totalPages = Math.ceil(sortedFavoriteItems.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedItems = sortedFavoriteItems.slice(startIndex, endIndex);

	useEffect(() => {
		setPopularPage(1);
	}, [popularSortBy]);

	useEffect(() => {
		setCurrentPage(1);
	}, [favoritesSortBy]);

	// If favorites shrink and current page exceeds total pages, clamp to last page to avoid empty results
	useEffect(() => {
		if (totalPages > 0 && currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	// Sort and paginate all items for popular items section
	const sortedPopularItems = useMemo(() => sortItems(props.items, popularSortBy), [props.items, popularSortBy]);
	const popularTotalPages = Math.ceil(sortedPopularItems.length / popularItemsPerPage);
	const popularStartIndex = (popularPage - 1) * popularItemsPerPage;
	const popularEndIndex = popularStartIndex + popularItemsPerPage;
	const paginatedPopularItems = sortedPopularItems.slice(popularStartIndex, popularEndIndex);

	// Translated sort options
	const translatedSortOptions = POPULAR_ITEMS_SORT_OPTIONS.map((opt) => ({
		value: opt.value,
		label: tListing(opt.label)
	}));

	// Handle page change for favorites
	const handlePageChange = (newPage: number) => {
		clampAndScrollToTop(newPage, totalPages, setCurrentPage);
	};

	// Handle page change for popular items
	const handlePopularPageChange = (page: number) => {
		clampAndScrollToTop(page, popularTotalPages, setPopularPage);
	};

	// Carousel functions - improved logic
	const carouselMaxScroll = Math.max(0, (carouselItemsTotal - carouselItemsToShow) * carouselItemWidth);

	const handleCarouselPrev = useCallback(() => {
		setCarouselPosition((prev) => Math.max(prev - carouselItemWidth, 0));
	}, []);

	const handleCarouselNext = useCallback(() => {
		setCarouselPosition((prev) => {
			const newPosition = prev + carouselItemWidth;
			return Math.min(newPosition, carouselMaxScroll);
		});
	}, [carouselMaxScroll]);

	const canCarouselPrev = carouselPosition > 0;
	const canCarouselNext = carouselPosition < carouselMaxScroll;
	const isCarouselAtEnd = carouselPosition >= carouselMaxScroll;

	if (!user?.id) {
		return (
			<div className="text-center py-12">
				<div className="max-w-md mx-auto">
					<div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
						<Heart className="w-8 h-8 text-red-500 dark:text-red-400" />
					</div>
					<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						{t('SIGN_IN_TO_VIEW_FAVORITES', {
							defaultValue: 'Sign in to view your favorites'
						})}
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-6">
						{t('FAVORITES_SIGN_IN_DESCRIPTION', {
							defaultValue: 'Create an account or sign in to save and view your favorite items.'
						})}
					</p>
					<Link
						href={`/auth/signin`}
						className="inline-flex items-center px-6 py-3 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					>
						{t('SIGN_IN_TO_VIEW_FAVORITES', {
							defaultValue: 'Sign in to view your favorites'
						})}
					</Link>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="bg-white/80 dark:bg-[#0a0a0a]/80 rounded-2xl p-6 shadow-lg animate-pulse">
						<div className="flex items-center gap-4 mb-4">
							<div className="w-12 h-12 bg-gray-200 dark:bg-white/8 rounded-2xl" />
							<div className="flex-1">
								<div className="h-4 bg-gray-200 dark:bg-white/8 rounded-sm mb-2" />
								<div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm w-2/3" />
							</div>
						</div>
						<div className="space-y-2">
							<div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm" />
							<div className="h-3 bg-gray-200 dark:bg-white/8 rounded-sm w-4/5" />
						</div>
					</div>
				))}
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="text-center py-12">
				<div className="max-w-md mx-auto">
					<div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 rounded-full flex items-center justify-center">
						<Heart className="w-8 h-8 text-red-500 dark:text-red-400" />
					</div>
					<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
						{t('ERROR_LOADING_FAVORITES', {
							defaultValue: 'Error loading favorites'
						})}
					</h3>
					<p className="text-gray-600 dark:text-gray-300 mb-6">
						{t('FAVORITES_ERROR_DESCRIPTION', {
							defaultValue: 'There was an error loading your favorites. Please try again.'
						})}
					</p>
					<button
						onClick={() => window.location.reload()}
						className="inline-flex items-center px-6 py-3 bg-linear-to-r from-theme-primary-600 to-theme-primary-700 hover:from-theme-primary-700 hover:to-theme-primary-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
					>
						{t('RETRY')}
					</button>
				</div>
			</div>
		);
	}

	// Empty state - show message and popular items
	if (favoriteItems.length === 0) {
		return (
			<div className="space-y-12">
				{/* Empty state message */}
				<div className="text-center py-8">
					<div className="max-w-md mx-auto">
						<div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-gray-100 to-blue-100 dark:from-[#0a0a0a]/30 dark:to-blue-900/30 rounded-full flex items-center justify-center">
							<Star className="w-8 h-8 text-gray-500 dark:text-gray-400" />
						</div>
						<h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
							{t('NO_FAVORITES_YET', {
								defaultValue: 'No favorites yet'
							})}
						</h3>
						<p className="text-gray-600 dark:text-gray-300">
							{t('FAVORITES_EMPTY_DESCRIPTION', {
								defaultValue: 'Start exploring and add items to your favorites to see them here.'
							})}
						</p>
					</div>
				</div>

				{/* Popular items section */}
				{props.items.length > 0 && (
					<div className="space-y-6">
						{/* Section header with sort and view toggle */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
								{t('OUR_MOST_POPULAR_ITEMS', {
									defaultValue: 'Our most popular items'
								})}
							</h2>
							<div className="flex items-center gap-3">
								<SortMenu
									options={translatedSortOptions}
									value={popularSortBy}
									onSortChange={(value) => setPopularSortBy(value as SortOption)}
									ariaLabel={t('SORT_POPULAR_ITEMS', { defaultValue: 'Sort popular items' })}
									className="w-full sm:w-auto sm:min-w-45"
								/>
								<ViewToggle
									activeView={layoutKey}
									onViewChange={handleViewChange}
								/>
							</div>
						</div>

						{/* Items grid */}
						<LayoutComponent>
							{paginatedPopularItems.map((item) => (
								<Item key={item.slug} {...item} layout={layoutKey} />
							))}
						</LayoutComponent>

						{/* Pagination */}
						{popularTotalPages > 1 && (
							<div className="flex justify-center mt-8">
								<UniversalPagination
									page={popularPage}
									totalPages={popularTotalPages}
									onPageChange={handlePopularPageChange}
								/>
							</div>
						)}
					</div>
				)}
			</div>
		);
	}

	// Favorites grid
	return (
		<div className="space-y-6">
			{/* Stats, Sort Menu and View Toggle */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="flex items-center gap-2">
					<Heart className="w-5 h-5 text-red-500" />
					<span className="text-sm text-gray-600 dark:text-gray-300">
						{favoriteItems.length} {t('FAVORITE_ITEMS', { defaultValue: 'favorite items' })}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<SortMenu
						options={translatedSortOptions}
						value={favoritesSortBy}
						onSortChange={(value) => setFavoritesSortBy(value as SortOption)}
						ariaLabel={t('SORT_FAVORITES', { defaultValue: 'Sort favorites' })}
						className="w-full sm:w-auto sm:min-w-45"
					/>
					<ViewToggle
						activeView={layoutKey}
						onViewChange={handleViewChange}
					/>
				</div>
			</div>
			<LayoutComponent>
				{paginatedItems.map((favorite) => (
					<Item key={favorite.slug} {...favorite} layout={layoutKey} />
				))}
			</LayoutComponent>
			{totalPages > 1 && (
				<div className="flex justify-center mt-8">
					<UniversalPagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
				</div>
			)}

			{/* Recommended Items Carousel - Excludes favorited items */}
			{carouselItems.length > 0 && (
				<div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10">
					{/* Section Header with "See More" button */}
					<div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<p className="text-sm text-gray-600 dark:text-gray-400 mt-1 pl-8">
							{t('EXPLORE_ITEMS', { defaultValue: 'Explore more items from our collection' })}
						</p>
						
						{/* "See More" button at the top right */}
						{carouselItemsTotal > carouselItemsToShow && (
							<Link
								href="/"
								className="inline-flex items-center -mb-4 gap-2 px-4 py-1.5 text-xs bg-primary-600 dark:bg-white text-white dark:text-taupe-900 rounded-full font-medium transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
							>
								{t('SHOW_ALL', { defaultValue: 'See More' })}
								<ArrowRight className="w-4 h-4" />
							</Link>
						)}
					</div>

					{/* Carousel Container with side buttons */}
					<div className="relative">
						{/* Left Navigation Button - hidden instead of disabled */}
						{carouselItemsTotal > carouselItemsToShow && (
							<button
								onClick={handleCarouselPrev}
								className={`absolute -left-5 top-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 rounded-full bg-white dark:bg-white/10 shadow-lg hover:shadow-xl text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-all duration-200 hover:-translate-x-1 pointer-events-auto ${
									!canCarouselPrev ? 'hidden' : ''
								}`}
								aria-label={t('PREVIOUS', { defaultValue: 'Previous' })}
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
						)}

						{/* Carousel Content */}
						<div className="overflow-hidden rounded-lg py-3 pl-8">
							<div
								ref={carouselRef}
								className="flex gap-3 transition-transform duration-300 ease-out"
								style={{ transform: `translateX(-${carouselPosition}px)` }}
							>
								{carouselItems.slice(0, carouselItemsTotal).map((item) => (
									<div
										key={item.slug}
										className="flex-shrink-0 w-80"
									>
										<Item {...item} layout="grid" />
									</div>
								))}
							</div>
						</div>

						{/* Right Navigation Button - hidden instead of disabled */}
						{carouselItemsTotal > carouselItemsToShow && (
							<button
								onClick={handleCarouselNext}
								className={`absolute -right-5 top-1/2 -translate-y-1/2 cursor-pointer z-10 p-2 rounded-full bg-white dark:bg-white/10 shadow-lg hover:shadow-xl text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-all duration-200 hover:translate-x-1 pointer-events-auto ${
									!canCarouselNext ? 'hidden' : ''
								}`}
								aria-label={t('NEXT_STEP', { defaultValue: 'Next' })}
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						)}

						{/* Left Gradient Overlay */}
						{carouselPosition > 0 && carouselItemsTotal > carouselItemsToShow && (
							<div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
						)}

						{/* Right Gradient Overlay */}
						{carouselItemsTotal > carouselItemsToShow && (
							<div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent pointer-events-none" />
						)}
					</div>

					{/* Carousel Indicators */}
					{carouselItemsTotal > carouselItemsToShow && (
						<div className="flex justify-center gap-2 mt-8">
							{Array.from({
								length: Math.ceil((carouselItemsTotal - carouselItemsToShow) / 1) + 1
							}).map((_, index) => {
								const indicatorPosition = index * carouselItemWidth;
								const isActive = Math.round(carouselPosition / carouselItemWidth) === index;
								return (
									<button
										key={index}
										onClick={() => setCarouselPosition(indicatorPosition)}
										className={`h-2 rounded-full transition-all duration-300 ${
											isActive
												? 'w-6 bg-theme-primary-600 dark:bg-white'
												: 'w-2 bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/30'
										}`}
										aria-label={`Go to carousel page ${index + 1}`}
										aria-current={isActive ? 'page' : undefined}
									/>
								);
							})}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
