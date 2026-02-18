import { Category } from '@/lib/content';
import LayoutGrid from '@/components/layouts/LayoutGrid';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FiFolder } from 'react-icons/fi';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { clampAndScrollToTop } from '@/utils/pagination';
import { useLayoutTheme } from '@/components/context';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@heroui/react';
import { useInView } from 'react-intersection-observer';
import { PER_PAGE, totalPages } from '@/lib/paginate';
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';
import { UniversalPagination } from '@/components/universal-pagination';

const PAGE_SIZE = PER_PAGE;

export default function CategoriesGrid({ categories }: { categories: Category[] }) {
	const { paginationType } = useLayoutTheme();
	const [page, setPage] = useState(1);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [loadingCategory, setLoadingCategory] = useState<string | null>(null);

	useEffect(() => {
		setLoadingCategory(null);
	}, [pathname, searchParams]);

	// Sync page state with URL searchParams when using standard pagination
	useEffect(() => {
		if (paginationType === 'standard') {
			const pageParam = searchParams.get('page');
			const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
			// Validate parsed page is a valid number and within bounds
			const validPage = !isNaN(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
			setPage((currentPage) => {
				// Only update if the page from URL is different from current state
				return validPage !== currentPage ? validPage : currentPage;
			});
		}
	}, [searchParams, paginationType]);

	const sortedCategories = useMemo(
		() =>
			categories && categories.length > 0 ? [...categories].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)) : [],
		[categories]
	);

	// Infinite loading logic
	const {
		displayedItems: loadedCategories,
		hasMore,
		isLoading,
		error,
		loadMore
	} = useInfiniteLoading({
		items: sortedCategories,
		initialPage: 1,
		perPage: PAGE_SIZE
	});

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	const { ref: loadMoreRef } = useInView({
		onChange: (inView) => {
			if (inView && !isLoading && hasMore && paginationType === 'infinite' && loadedCategories.length > 0) {
				if (debounceRef.current) clearTimeout(debounceRef.current);
				debounceRef.current = setTimeout(() => {
					loadMore();
				}, 150); // 150ms debounce
			}
		},
		threshold: 0.5,
		rootMargin: '100px'
	});

	const pagedCategories = useMemo(
		() => sortedCategories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		[sortedCategories, page]
	);

	// Calculate total pages for standard pagination using exported function
	const totalPagesCount = totalPages(sortedCategories.length, PAGE_SIZE);

	// Choose which categories to show
	const categoriesToShow = paginationType === 'infinite' ? loadedCategories : pagedCategories;

	const handleCategoryClick = (categoryId: string) => {
		setLoadingCategory(categoryId);
		router.push(`/?categories=${categoryId}`);
	};

	const handlePageChange = useCallback(
		(newPage: number) => {
			if (paginationType !== 'standard') return;
			const totalPagesCount = totalPages(sortedCategories.length, PAGE_SIZE);
			const params = new URLSearchParams(searchParams.toString());
			clampAndScrollToTop(newPage, totalPagesCount, (clampedPage) => {
				if (clampedPage === 1) {
					params.delete('page');
				} else {
					params.set('page', clampedPage.toString());
				}
				const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
				router.push(newUrl, { scroll: false });
				setPage(clampedPage);
			});
		},
		[paginationType, pathname, router, searchParams, sortedCategories]
	);

	// Don't render if no categories
	if (!categories || categories.length === 0) {
		return null;
	}

	return (
		<>
			<LayoutGrid>
				{categoriesToShow.map((category) => (
					<div
						key={category.id}
						className="focus:outline-hidden focus:ring-2 focus:ring-theme-primary rounded-lg transition group cursor-pointer relative"
						onClick={() => handleCategoryClick(category.id)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleCategoryClick(category.id);
							}
						}}
						role="button"
						aria-label={`View ${category.name} category`}
						tabIndex={0}
					>
						{/* Loading overlay */}
						{loadingCategory === category.id && (
							<div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs rounded-lg flex items-center justify-center z-50 transition-opacity duration-300">
								<Spinner size="lg" color="primary" />
							</div>
						)}
						<Card
							className="group relative border-0 rounded-lg transition-all duration-700 transform backdrop-blur-xl overflow-hidden h-full
								bg-white/80 dark:bg-gray-900/80 shadow-md hover:shadow-xl
								ring-1 ring-gray-200/50 dark:ring-gray-700/50 hover:ring-theme-primary/70
								px-4 py-4 sm:px-5 sm:py-5
							"
						>
							{/* Subtle background pattern */}
							<div
								className="absolute inset-0 opacity-10 dark:opacity-35"
								style={{
									backgroundImage:
										"url('data:image/svg+xml,%3Csvg width=&apos;40&apos; height=&apos;40&apos; viewBox=&apos;0 0 40 40&apos; xmlns=&apos;http://www.w3.org/2000/svg&apos;%3E%3Cg fill=&apos;#000000&apos; fill-opacity=&apos;0.05&apos; fill-rule=&apos;evenodd&apos;%3E%3Cpath d=&apos;M0 0h40v40H0V0zm1 1h38v38H1V1z&apos; /%3E%3C/g%3E%3C/svg%3E')",
								}}
							/>
							{/* Decorative top image (non-interactive) - uses category.image_url if available */}
							<div className="pointer-events-none absolute left-0 right-0 top-0 z-20 opacity-40 group-hover:opacity-70 transition-opacity duration-500">
								<Image
									src={(category as any).image_url ?? category.icon_url ?? '/bg-cards.png'}
									alt={category.name}
									width={800}
									height={160}
									className="w-full h-40 object-cover filter brightness-0 dark:brightness-200"
								/>
							</div>
							{/* Icon with animated background */}
							<div className="relative flex flex-col items-center justify-center pt-1 pb-2">
								<div className="relative shrink-0">
									<div className="w-11 h-11 flex items-center justify-center rounded-lg transition-all duration-500 bg-linear-to-br from-theme-primary-10 to-indigo-100 border border-theme-primary-500 group-hover:from-theme-primary-10 group-hover:to-indigo-200 dark:from-theme-primary-10 dark:to-indigo-900/30 dark:border-theme-primary-700/30 dark:group-hover:from-theme-primary-800/40 dark:group-hover:to-indigo-800/40 shadow-xs group-hover:shadow-md">
										{category.icon_url ? (
											<Image
												src={category.icon_url}
												alt={category.name}
												width={24}
												height={24}
												className="w-6 h-6 object-contain transition-transform duration-500"
											/>
										) : (
											<FiFolder className="w-6 h-6 text-theme-primary dark:text-theme-primary transition-transform duration-500" />
										)}
									</div>
									{/* Pulse effect */}
									<div className="absolute inset-0 rounded-lg bg-theme-primary-10 opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300" />
								</div>
							</div>
							<CardHeader className="items-center text-center p-0 mb-1">
								<CardTitle className="text-base font-semibold group-hover:text-theme-primary transition-colors">
									{category.name}
								</CardTitle>
							</CardHeader>
							{category.count !== undefined && (
								<div className="absolute top-3 left-3 z-20">
									<div className="inline-flex items-center px-3 py-1.5 rounded-full 
										bg-theme-primary/10 dark:bg-theme-primary/20
										border border-theme-primary/20 dark:border-theme-primary/30
										text-xs font-medium text-theme-primary dark:text-theme-primary-400
										backdrop-blur-sm
										group-hover:bg-theme-primary/15 dark:group-hover:bg-theme-primary/25
										group-hover:border-theme-primary/30 dark:group-hover:border-theme-primary/40
										transition-all duration-300">
										{category.count} items
									</div>
								</div>
							)}
							{/* Enhanced hover indicator */}
							<div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
								<div className="w-6 h-6 rounded-full bg-theme-primary-500/10 dark:bg-theme-primary-400/10 flex items-center justify-center backdrop-blur-xs border border-theme-primary-10 dark:border-theme-primary">
									<svg
										className="w-3 h-3 text-theme-primary-600 dark:text-theme-primary-400"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path d="M17 7l-10 10M7 7h10v10" />
									</svg>
								</div>
							</div>
							{/* Subtle glow effect */}
							<div className="absolute inset-0 rounded-lg bg-linear-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
						</Card>
					</div>
				))}
			</LayoutGrid>
			{/* Standard Pagination */}
			{paginationType === 'standard' && totalPagesCount > 1 && (
				<UniversalPagination page={page} totalPages={totalPagesCount} onPageChange={handlePageChange} />
			)}

			{/* Infinite Scroll Loader */}
			{paginationType === 'infinite' && (
				<div className="flex flex-col items-center gap-6 mt-16 mb-12">
					{/* Show spinner on initial load */}
					{isLoading && loadedCategories.length === 0 && (
						<div className="w-full flex items-center justify-center py-8">
							<div className="flex items-center gap-2 text-theme-primary-500 dark:text-theme-primary-400">
								<Loader2 className="h-5 w-5 animate-spin" />
								<span className="text-sm font-medium">Loading...</span>
							</div>
						</div>
					)}
					{hasMore && (
						<div ref={loadMoreRef} className="w-full flex items-center justify-center py-8">
							{error ? (
								<div className="text-center py-4">
									<p className="text-sm text-red-600 dark:text-red-400 mb-2">{error.message}</p>
									<button
										onClick={() => loadMore()}
										className="text-sm text-theme-primary-500 dark:text-theme-primary-400 hover:text-theme-primary-700 dark:hover:text-theme-primary-300 transition-colors"
									>
										Retry
									</button>
								</div>
							) : (
								<div className="flex items-center gap-2 text-theme-primary-500 dark:text-theme-primary-400">
									{isLoading && (
										<>
											<Loader2 className="h-5 w-5 animate-spin" />
											<span className="text-sm font-medium">Loading...</span>
										</>
									)}
								</div>
							)}
						</div>
					)}
					{!hasMore && !error && (
						<div className="text-center py-4">
							<p className="text-sm text-gray-500 dark:text-gray-400">You&apos;ve reached the end</p>
						</div>
					)}
				</div>
			)}
		</>
	);
}
