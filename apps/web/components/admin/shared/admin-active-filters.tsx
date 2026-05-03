'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface ActiveFilter {
	id: string;
	type: string;
	label: string;
	value: string;
	icon?: ReactNode;
}

export interface AdminActiveFiltersProps {
	filters: ActiveFilter[];
	onRemove: (filter: ActiveFilter) => void;
	onClearAll?: () => void;
	clearAllThreshold?: number;
	className?: string;
}

export function AdminActiveFilters({
	filters,
	onRemove,
	onClearAll,
	clearAllThreshold = 2,
	className,
}: AdminActiveFiltersProps) {
	const t = useTranslations('admin.SHARED');

	if (filters.length === 0) return null;

	return (
		<div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
			{filters.map((filter) => (
				<span
					key={filter.id}
					className={cn(
						'inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium',
						'bg-theme-primary/8 dark:bg-theme-primary/12 text-theme-primary',
						'border border-theme-primary/20 dark:border-theme-primary/20'
					)}
				>
					{filter.icon && (
						<span className="shrink-0 opacity-70">{filter.icon}</span>
					)}
					<span className="leading-none">
						<span className="opacity-60">{filter.label}:</span>{' '}
						{filter.value}
					</span>
					<button
						type="button"
						onClick={() => onRemove(filter)}
						aria-label={t('REMOVE_FILTER', { name: filter.value })}
						className={cn(
							'p-0.5 rounded-full',
							'hover:bg-theme-primary/20 dark:hover:bg-theme-primary/25',
							'transition-colors duration-100',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40'
						)}
					>
						<X className="h-3 w-3" />
					</button>
				</span>
			))}

			{filters.length >= clearAllThreshold && onClearAll && (
				<button
					type="button"
					onClick={onClearAll}
					className={cn(
						'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
						'text-gray-400 dark:text-gray-500',
						'hover:text-red-500 dark:hover:text-red-400',
						'hover:bg-red-50 dark:hover:bg-red-500/8',
						'transition-all duration-150',
						'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40'
					)}
				>
					<X className="h-3 w-3" />
					{t('CLEAR_ALL')}
				</button>
			)}
		</div>
	);
}
