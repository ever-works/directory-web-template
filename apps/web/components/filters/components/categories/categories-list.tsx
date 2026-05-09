import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { CategoriesListProps } from '../../types';
import { CategoryItem } from './category-item';
import { useFilters } from '../../context/filter-context';
import { isCategoryPagePath } from '@/lib/utils';

const CATEGORY_ROW_HEIGHT = 40;
const CATEGORY_LIST_VIEWPORT_CLASS =
	'overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1';

type CategoryEntry = CategoriesListProps['categories'][number];

function VirtualizedCategoryItems({
	categories,
	renderCategory
}: {
	categories: CategoryEntry[];
	renderCategory: (category: CategoryEntry) => ReactNode;
}) {
	const scrollParentRef = useRef<HTMLDivElement>(null);
	const rowVirtualizer = useVirtualizer({
		count: categories.length,
		getScrollElement: () => scrollParentRef.current,
		estimateSize: () => CATEGORY_ROW_HEIGHT,
		overscan: 8
	});

	if (categories.length === 0) {
		return null;
	}

	return (
		<div ref={scrollParentRef} className={CATEGORY_LIST_VIEWPORT_CLASS}>
			<div
				className="relative w-full"
				style={{
					height: `${rowVirtualizer.getTotalSize()}px`
				}}
			>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const category = categories[virtualRow.index];
					if (!category) return null;

					return (
						<div
							key={category.id}
							className="absolute left-0 top-0 w-full"
							style={{
								height: `${virtualRow.size}px`,
								transform: `translateY(${virtualRow.start}px)`
							}}
						>
							{renderCategory(category)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Categories list component
 * Renders a list of category items with "All Categories" option
 */
export function CategoriesList({
	categories,
	mode = 'navigation',
	selectedCategories: propSelectedCategories,
	onCategoryToggle: propOnCategoryToggle
}: CategoriesListProps) {
	const t = useTranslations('listing');
	const pathname = usePathname();
	const {
		selectedCategories: contextSelectedCategories,
		toggleSelectedCategory,
		clearSelectedCategories
	} = useFilters();

	// Use props if provided, otherwise fall back to context
	const selectedCategories = propSelectedCategories ?? contextSelectedCategories;
	const visibleCategories = useMemo(() => categories.filter((category) => Boolean(category.count)), [categories]);

	const totalItems = categories.reduce((sum, cat) => sum + (cat.count || 0), 0);

	const allCategory = useMemo(
		() => ({
			id: 'all',
			name: t('ALL_CATEGORIES'),
			count: totalItems
		}),
		[t, totalItems]
	);

	// Handle category toggle for filter mode
	const handleCategoryToggle = useCallback(
		(categoryId: string) => {
			if (propOnCategoryToggle) {
				// Use prop callback if provided
				propOnCategoryToggle(categoryId);
			} else {
				// Fall back to context methods
				if (categoryId === 'all') {
					clearSelectedCategories();
				} else {
					toggleSelectedCategory(categoryId);
				}
			}
		},
		[propOnCategoryToggle, clearSelectedCategories, toggleSelectedCategory]
	);

	if (mode === 'filter') {
		const renderFilterCategory = (category: CategoryEntry) => {
			const isActive = selectedCategories.includes(category.id);

			return (
				<CategoryItem
					key={category.id}
					category={category}
					isActive={isActive}
					href="#"
					mode="filter"
					onToggle={() => handleCategoryToggle(category.id)}
				/>
			);
		};

		return (
			<div className="space-y-1.5 max-h-lvh">
				{/* All Categories Item */}
				<CategoryItem
					category={allCategory}
					isActive={selectedCategories.length === 0}
					href="#"
					isAllCategories={true}
					totalItems={totalItems}
					mode="filter"
					onToggle={() => handleCategoryToggle('all')}
				/>

				{/* Individual Categories */}
				<VirtualizedCategoryItems categories={visibleCategories} renderCategory={renderFilterCategory} />
			</div>
		);
	}

	const renderNavigationCategory = (category: CategoryEntry) => {
		const href = `/categories/${category.id}`;
		const isActive = isCategoryPagePath(pathname, href);

		return <CategoryItem key={category.id} category={category} isActive={isActive} href={href} />;
	};

	// Navigation mode (original behavior)
	return (
		<div className="space-y-1.5 max-h-lvh">
			{/* All Categories Item */}
			<CategoryItem
				category={allCategory}
				isActive={isCategoryPagePath(pathname)}
				href="/categories"
				isAllCategories={true}
				totalItems={totalItems}
			/>

			{/* Individual Categories */}
			<VirtualizedCategoryItems categories={visibleCategories} renderCategory={renderNavigationCategory} />
		</div>
	);
}
