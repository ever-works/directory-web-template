'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface ActiveFilter {
	/** Unique filter identifier (e.g., "category:tech" or "tag:react") */
	id: string;
	/** Filter type/group (e.g., "category", "tag", "dateRange") */
	type: string;
	/** Display label for the filter type */
	label: string;
	/** Display value */
	value: string;
	/** Optional icon for the filter type */
	icon?: ReactNode;
}

export interface AdminActiveFiltersProps {
	/** List of active filters */
	filters: ActiveFilter[];
	/** Callback when a filter is removed */
	onRemove: (filter: ActiveFilter) => void;
	/** Callback to clear all filters */
	onClearAll?: () => void;
	/** Minimum filters to show "Clear All" button (default: 2) */
	clearAllThreshold?: number;
	/** Additional CSS classes */
	className?: string;
}

// Chip styles matching Items page pattern
const CHIP_CLASSES = cn(
	'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs font-medium rounded-full',
	'bg-theme-primary/10 text-theme-primary dark:bg-theme-primary/20'
);

const CHIP_REMOVE_CLASSES = cn(
	'p-0.5 rounded-full hover:bg-theme-primary/20 dark:hover:bg-theme-primary/30',
	'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50'
);

const CLEAR_ALL_CLASSES = cn(
	'text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
	'ml-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50'
);

/**
 * Active filter chips display component.
 * Shows chips for each active filter with individual remove buttons.
 * Shows "Clear All" button when multiple filters are active.
 *
 * @example
 * ```tsx
 * const activeFilters: ActiveFilter[] = [
 *   { id: 'category:tech', type: 'category', label: 'Category', value: 'Technology' },
 *   { id: 'tag:react', type: 'tag', label: 'Tag', value: 'React' },
 * ];
 *
 * <AdminActiveFilters
 *   filters={activeFilters}
 *   onRemove={(filter) => handleRemoveFilter(filter)}
 *   onClearAll={() => clearAllFilters()}
 * />
 * ```
 */
export function AdminActiveFilters({
	filters,
	onRemove,
	onClearAll,
	clearAllThreshold = 2,
	className,
}: AdminActiveFiltersProps) {
	const t = useTranslations('admin.SHARED');

	if (filters.length === 0) {
		return null;
	}

	return (
		<div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
			{filters.map((filter) => (
				<span key={filter.id} className={CHIP_CLASSES}>
					{filter.icon && <span className="mr-0.5">{filter.icon}</span>}
					<span>
						{filter.label}: {filter.value}
					</span>
					<button
						type="button"
						onClick={() => onRemove(filter)}
						className={CHIP_REMOVE_CLASSES}
						aria-label={t('REMOVE_FILTER', { name: filter.value })}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}

			{filters.length >= clearAllThreshold && onClearAll && (
				<button type="button" onClick={onClearAll} className={CLEAR_ALL_CLASSES}>
					{t('CLEAR_ALL')}
				</button>
			)}
		</div>
	);
}
