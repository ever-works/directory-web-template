'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Collection } from '@/types/collection';
import { CollectionsGrid } from '@/components/collections/collections-grid';
import { useLayoutTheme } from '@/components/context';
import { useInView } from 'react-intersection-observer';
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';
import { totalPages } from '@/lib/paginate';
import { CollectionsBreadcrumb } from './collections-breadcrumb';
import { InfiniteScrollSentinel } from './infinite-scroll-sentinel';
import { CollectionsPagination } from './collections-pagination';
import { Container } from '@/components/ui/container';

interface CollectionsGridContentProps {
	collections: Collection[];
}

export function CollectionsGridContent({ collections }: CollectionsGridContentProps) {
	let COLLECTIONS_PER_PAGE = 9;
	const { paginationType, itemsPerPage: defaultItemsPerPage } = useLayoutTheme();
	const itemsPerPage = defaultItemsPerPage || COLLECTIONS_PER_PAGE;

	// Infinite scroll logic
	const {
		displayedItems: loadedCollections,
		hasMore,
		isLoading,
		error,
		loadMore
	} = useInfiniteLoading({ items: collections, initialPage: 1, perPage: itemsPerPage });

	// Standard pagination logic
	const totalPagesCount = Math.max(1, totalPages(collections.length, itemsPerPage));
	const [currentPage, setCurrentPage] = useState(() => {
		return Math.max(1, Math.min(1, totalPagesCount));
	});

	// Reset currentPage if it falls outside valid range when collections change
	useEffect(() => {
		if (currentPage < 1 || currentPage > totalPagesCount) {
			setCurrentPage(Math.max(1, Math.min(currentPage, totalPagesCount)));
		}
	}, [totalPagesCount, currentPage]);

	// Clamp currentPage to valid range for calculations
	const safePage = Math.max(1, Math.min(currentPage, totalPagesCount));
	const startIndex = (safePage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;

	// Get current page collections for standard pagination
	const paginatedCollections = useMemo(() => {
		return collections.slice(startIndex, endIndex);
	}, [collections, startIndex, endIndex]);

	// Choose which collections to display based on pagination type
	const collectionsToShow = paginationType === 'infinite' ? loadedCollections : paginatedCollections;

	// Infinite scroll detection
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { ref: loadMoreRef } = useInView({
		onChange: (inView) => {
			if (inView && !isLoading && hasMore && paginationType === 'infinite' && loadedCollections.length > 0) {
				if (debounceRef.current) clearTimeout(debounceRef.current);
				debounceRef.current = setTimeout(() => {
					loadMore();
				}, 150); // 150ms debounce
			}
		},
		threshold: 0.1,
		rootMargin: '200px'
	});

	// Cleanup debounce timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
				debounceRef.current = null;
			}
		};
	}, []);

	const handlePageChange = (newPage: number) => {
		const numPage = Number(newPage);
		const clampedPage = Math.max(1, Math.min(isNaN(numPage) ? 1 : numPage, totalPagesCount));
		setCurrentPage(clampedPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	return (
		<>
			<Container maxWidth="7xl" padding="default" useGlobalWidth className="flex-1">
				<CollectionsBreadcrumb />
				<CollectionsGrid collections={collectionsToShow} />
				{paginationType === 'infinite' && (
					<div className="w-full">
						<InfiniteScrollSentinel
							ref={loadMoreRef}
							hasMore={hasMore}
							isLoading={isLoading}
							error={error}
							onRetry={loadMore}
						/>
					</div>
				)}
			</Container>
			{paginationType === 'standard' && (
				<CollectionsPagination page={safePage} totalPages={totalPagesCount} onPageChange={handlePageChange} />
			)}
		</>
	);
}
