'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Tag } from '@/lib/content';
import { TagsCards } from '@/components/tags-cards';
import UniversalPagination from '@/components/universal-pagination';
import { clampAndScrollToTop } from '@/utils/pagination';
import Hero from '@/components/hero';
import { useTranslations } from 'next-intl';
import { useLayoutTheme } from '@/components/context';
import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { GridBackground, DotBgsible } from '@/components/shared/decorative-bg';

/**
 * Hook to calculate optimal items per page based on viewport height
 * Ensures pagination stays visible without scrolling
 */
function useResponsiveItemsPerPage(defaultItemsPerPage: number) {
	const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);

	const calculateItemsPerPage = useCallback(() => {
		if (typeof window === 'undefined') return defaultItemsPerPage;

		const viewportHeight = window.innerHeight;
		// Estimate space taken by header, hero section, and pagination
		// Hero header ~200px, pagination ~80px, margins ~100px
		const reservedHeight = 380;
		const availableHeight = viewportHeight - reservedHeight;

		// Card height estimate: ~90px in compact mode (with gap)
		const cardHeight = 90;
		// Get number of columns based on viewport width
		const viewportWidth = window.innerWidth;
		let columns = 1;
		if (viewportWidth >= 1280)
			columns = 4; // xl
		else if (viewportWidth >= 1024)
			columns = 3; // lg
		else if (viewportWidth >= 640) columns = 2; // sm

		// Calculate rows that fit
		const rowsThatFit = Math.max(2, Math.floor(availableHeight / cardHeight));
		const calculatedItems = rowsThatFit * columns;

		// Return calculated items, minimum 8, maximum 40
		return Math.min(40, Math.max(8, calculatedItems));
	}, [defaultItemsPerPage]);

	useEffect(() => {
		const handleResize = () => {
			setItemsPerPage(calculateItemsPerPage());
		};

		// Calculate on mount
		handleResize();

		// Recalculate on resize
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [calculateItemsPerPage]);

	return itemsPerPage;
}

function TagsGridContent({ tags }: { tags: Tag[] }) {
	const t = useTranslations('listing');
	const tCommon = useTranslations('common');
	const tGrid = useTranslations('admin.TAGS_GRID_CLIENT');
	const { paginationType, itemsPerPage: defaultItemsPerPage } = useLayoutTheme();
	const [page, setPage] = useState(1);

	// Use responsive items per page for standard pagination
	const responsiveItemsPerPage = useResponsiveItemsPerPage(defaultItemsPerPage);
	const itemsPerPage = paginationType === 'standard' ? responsiveItemsPerPage : defaultItemsPerPage;

	const {
		displayedItems: loadedTags,
		hasMore,
		isLoading,
		error,
		loadMore
	} = useInfiniteLoading({ items: tags, initialPage: 1, perPage: defaultItemsPerPage });

	// Calculate total pages for pagination
	const totalPages = Math.ceil(tags.length / itemsPerPage);

	const pagedTags = useMemo(
		() => tags.slice((page - 1) * itemsPerPage, page * itemsPerPage),
		[tags, page, itemsPerPage]
	);

	// Reset to page 1 if current page exceeds total pages (can happen on resize)
	useEffect(() => {
		if (page > totalPages && totalPages > 0) {
			setPage(1);
		}
	}, [page, totalPages]);
	const tagsToShow = paginationType === 'infinite' ? loadedTags : pagedTags;

	// Move hooks above early return to avoid conditional hook call
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { ref: loadMoreRef } = useInView({
		onChange: (inView) => {
			if (inView && !isLoading && hasMore && paginationType === 'infinite' && loadedTags.length > 0) {
				if (debounceRef.current) clearTimeout(debounceRef.current);
				debounceRef.current = setTimeout(() => {
					loadMore();
				}, 150); // 150ms debounce
			}
		},
		threshold: 0.5,
		rootMargin: '100px'
	});

	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
				debounceRef.current = null;
			}
		};
	}, []);

	// Handle empty state
	if (tags.length === 0) {
		return (
			<Hero badgeText={t('TAGS')} title={t('TAGS')} description={tCommon('TAGS_DESCRIPTION')}>
				<div className="text-center py-12">
					<p className="text-gray-500 dark:text-gray-400">{tGrid('NO_TAGS_FOUND')}</p>
				</div>
			</Hero>
		);
	}


	const handlePageChange = (newPage: number) => {
		clampAndScrollToTop(newPage, totalPages, setPage);
	};

	return (
		<div className="relative">
		<Hero
			badgeText={t('TAGS')}
			title={
				<span className="bg-linear-to-r from-theme-primary-500 via-purple-500 to-theme-primary-600 bg-clip-text text-transparent">
					{t('TAGS', { defaultValue: 'Tags' })}
				</span>
			}
			description={tCommon('TAGS_DESCRIPTION', {
				defaultValue: 'Browse all tags in our directory.'
			})}
			className="min-h-screen text-center flex flex-col"
		>
			<div className="absolute inset-x-0 -top-20 w-full h-[350px] flex justify-center items-start -z-10">
				<GridBackground className="w-full h-full" />
			</div>
			{/* Breadcrumb */}
			<nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
				<ol className="inline-flex items-center space-x-1 md:space-x-3">
					<li className="inline-flex items-center text-black dark:text-white">
						<Link
							href="/"
							className="inline-flex items-center text-sm font-medium text-black dark:text-white hover:text-theme-primary dark:hover:text-theme-primary transition-colors duration-300"
						>
							<svg
								className="w-3 h-3 mr-2.5 text-dark--theme-800 dark:text-white"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
							</svg>
							{tCommon('HOME')}
						</Link>
					</li>
					<li>
						<div className="flex items-center">
							<svg
								className="w-3 h-3 text-dark--theme-800 dark:text-white mx-1"
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 6 10"
							>
								<path
									stroke="currentColor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="m1 9 4-4-4-4"
								/>
							</svg>
							<span className="ml-1 text-sm font-medium text-gray-800 dark:text-white/50 md:ml-2 transition-colors duration-300">
								{t('TAGS')}
							</span>
						</div>
					</li>
				</ol>
			</nav>

			<Container maxWidth="7xl" padding="lg" useGlobalWidth className="flex-1">
				<TagsCards tags={tagsToShow} compact />
			</Container>
			{/* Standard Pagination - sticky at bottom */}
			{paginationType === 'standard' && (
				<footer className="flex items-center justify-center py-6  bottom-0 bg-gradient-to-t ">
					<UniversalPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
				</footer>
			)}
			{/* Infinite Scroll Loader */}
			{paginationType === 'infinite' && (
				<div className="flex flex-col items-center gap-6 mt-16 mb-12">
					{hasMore && (
						<div ref={loadMoreRef} className="w-full flex items-center justify-center py-8">
							{error ? (
								<div className="text-center py-4">
									<p className="text-sm text-red-600 dark:text-red-400 mb-2">
										{tGrid('FAILED_TO_LOAD_MORE_TAGS')}
									</p>
									<button
										onClick={() => loadMore()}
										className="text-sm text-theme-primary-500 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 transition-colors focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 rounded-sm px-2 py-1"
									>
										{tGrid('RETRY')}
									</button>
								</div>
							) : (
								<div className="flex items-center gap-2 text-theme-primary-500 dark:text-theme-primary-400">
									{isLoading && (
										<>
											<Loader2 className="h-5 w-5 animate-spin" />
											<span className="text-sm font-medium">{tGrid('LOADING')}</span>
										</>
									)}
								</div>
							)}
						</div>
					)}
					{!hasMore && !error && (
						<div className="text-center py-4">
							<p className="text-sm text-gray-500 dark:text-gray-400">{tGrid('REACHED_THE_END')}</p>
						</div>
					)}
				</div>
			)}
		</Hero>
		<DotBgsible />
		</div>
	);
}

export default function TagsGridClient({ tags }: { tags: Tag[] }) {
	return <TagsGridContent tags={tags} />;
}
