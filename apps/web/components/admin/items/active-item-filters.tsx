"use client";

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ActiveItemFiltersProps {
	categoriesFilter: string[];
	tagsFilter: string[];
	onRemoveCategory: (categoryId: string) => void;
	onRemoveTag: (tagId: string) => void;
	onClearAll: () => void;
	categories: Array<{ id: string; name: string }>;
	tags: Array<{ id: string; name: string }>;
}

// Chip styles
const CHIP = cn(
	'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium rounded-full',
	'bg-theme-primary/10 text-theme-primary dark:bg-theme-primary/20'
);

const CHIP_REMOVE = cn(
	'p-0.5 rounded-full hover:bg-theme-primary/20 dark:hover:bg-theme-primary/30',
	'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50'
);

/**
 * Active Item Filters Component
 * Shows chips for selected categories and tags
 */
export function ActiveItemFilters({
	categoriesFilter,
	tagsFilter,
	onRemoveCategory,
	onRemoveTag,
	onClearAll,
	categories,
	tags,
}: ActiveItemFiltersProps) {
	const t = useTranslations('admin.ADMIN_ITEMS_PAGE');

	// Get category name by id
	const getCategoryName = (categoryId: string): string => {
		const category = categories.find(c => c.id === categoryId);
		return category?.name || categoryId;
	};

	// Get tag name by id
	const getTagName = (tagId: string): string => {
		const tag = tags.find(t => t.id === tagId);
		return tag?.name || tagId;
	};

	const hasActiveFilters = categoriesFilter.length > 0 || tagsFilter.length > 0;

	if (!hasActiveFilters) {
		return null;
	}

	return (
		<div className="flex items-center gap-1.5 flex-wrap">
			{/* Category Chips */}
			{categoriesFilter.map((categoryId) => (
				<span key={`cat-${categoryId}`} className={CHIP}>
					<span>{getCategoryName(categoryId)}</span>
					<button
						type="button"
						onClick={() => onRemoveCategory(categoryId)}
						className={CHIP_REMOVE}
						aria-label={t('REMOVE_FILTER', { name: getCategoryName(categoryId) })}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}

			{/* Tag Chips */}
			{tagsFilter.map((tagId) => (
				<span key={`tag-${tagId}`} className={CHIP}>
					<span>{getTagName(tagId)}</span>
					<button
						type="button"
						onClick={() => onRemoveTag(tagId)}
						className={CHIP_REMOVE}
						aria-label={t('REMOVE_FILTER', { name: getTagName(tagId) })}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}

			{/* Clear All */}
			{(categoriesFilter.length + tagsFilter.length) > 1 && (
				<button
					type="button"
					onClick={onClearAll}
					className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50"
				>
					{t('CLEAR_ALL_FILTERS')}
				</button>
			)}
		</div>
	);
}
