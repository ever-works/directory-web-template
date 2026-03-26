import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { CategoriesListProps } from '../../types';
import { CategoryItem } from './category-item';
import { useFilters } from '../../context/filter-context';
import { isCategoryPagePath } from '@/lib/utils';

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
				<div
					className="overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
				>
					{categories.map((category) => {
						if (!category.count) return null;

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
					})}
				</div>
			</div>
		);
	}

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
			<div
				className="overflow-y-auto max-h-[650px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full -mr-2 [&::-webkit-scrollbar]:w-1"
			>
				{categories.map((category) => {
					if (!category.count) return null;

					const href = `/categories/${category.id}`;
					const isActive = isCategoryPagePath(pathname, href);

					return <CategoryItem key={category.id} category={category} isActive={isActive} href={href} />;
				})}
			</div>
		</div>
	);
}
