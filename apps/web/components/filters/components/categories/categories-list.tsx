import { useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { CategoriesListProps } from '../../types';
import { CategoryItem } from './category-item';
import { useFilters } from '../../context/filter-context';
import { isCategoryPagePath, slugify } from '@/lib/utils';

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
		clearSelectedCategories,
		setSelectedCategories
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

	/**
	 * Handle category click in filter mode.
	 *
	 * UX contract:
	 *   - Plain click on category B (single-select):
	 *       - if A was selected → switch to just B
	 *       - if B was the only selected → clear (toggle off)
	 *   - Ctrl / Cmd / Shift + click on B (multi-select):
	 *       - toggle B in/out of the current selection
	 *   - Click on "All" → clear all
	 *
	 * `multi` is supplied by `CategoryItem.handleClick` based on
	 * MouseEvent modifier keys.
	 */
	const handleCategoryToggle = useCallback(
		(categoryId: string, multi = false) => {
			if (propOnCategoryToggle) {
				// Use prop callback if provided. Forward `multi` so callers can
				// honour modifier-key intent if they want; older callers ignore it.
				(propOnCategoryToggle as (id: string, multi?: boolean) => void)(categoryId, multi);
				return;
			}
			if (categoryId === 'all') {
				clearSelectedCategories();
				return;
			}
			// Normalize to slug form for the same reason as the render-side
			// `activeSlugs` set: URL round-trip slugifies categories, and
			// without this the state and the click value drift apart on
			// mixed-case category IDs.
			const slug = slugify(categoryId);
			if (multi) {
				toggleSelectedCategory(slug);
				return;
			}
			// Single-select branch.
			const isOnlyOneSelected =
				selectedCategories.length === 1 && slugify(selectedCategories[0]) === slug;
			if (isOnlyOneSelected) {
				clearSelectedCategories();
			} else {
				setSelectedCategories([slug]);
			}
		},
		[
			propOnCategoryToggle,
			clearSelectedCategories,
			toggleSelectedCategory,
			setSelectedCategories,
			selectedCategories
		]
	);

	if (mode === 'filter') {
		// Normalize on both sides because `FilterURLParser` slugifies the
		// `?categories=` URL param into state ("Practices" → "practices")
		// while the data layer hands us `category.id` verbatim from the
		// YAML (which can be mixed case). Without normalization the
		// visual `aria-pressed` state silently drifts from the URL truth.
		const activeSlugs = new Set(selectedCategories.map((s) => slugify(s)));
		const renderFilterCategory = (category: CategoryEntry) => {
			const isActive = activeSlugs.has(slugify(category.id));

			return (
				<CategoryItem
					key={category.id}
					category={category}
					isActive={isActive}
					href="#"
					mode="filter"
					onToggle={(id, multi) => handleCategoryToggle(id, multi)}
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
