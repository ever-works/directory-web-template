'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatusTabOption<T extends string = string> {
	/** Status value (empty string for "All") */
	value: T | '';
	/** Display label */
	label: string;
	/** Optional count to display */
	count?: number;
	/** Optional icon */
	icon?: ReactNode;
}

export interface AdminStatusTabsProps<T extends string = string> {
	/** Available status options */
	options: StatusTabOption<T>[];
	/** Currently selected status */
	value: T | '';
	/** Callback when status changes */
	onChange: (status: T | '') => void;
	/** Additional CSS classes */
	className?: string;
	/** Tab size variant */
	size?: 'sm' | 'md';
	/** Whether to show counts (default: true) */
	showCounts?: boolean;
}

// Tab styles matching Items page pattern
const TAB_BASE_CLASSES = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50'
);

const TAB_INACTIVE_CLASSES = cn(
	TAB_BASE_CLASSES,
	'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
);

const TAB_ACTIVE_CLASSES = cn(
	TAB_BASE_CLASSES,
	'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
);

const SIZE_CLASSES = {
	sm: 'text-xs px-2 py-0.5',
	md: 'text-xs px-2.5 py-1',
} as const;

const CONTAINER_CLASSES = cn(
	'flex items-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-0.5'
);

/**
 * Inline tab-style status filter component for admin pages.
 * Supports configurable status options with counts and keyboard navigation.
 *
 * @example
 * ```tsx
 * type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected';
 *
 * <AdminStatusTabs<ItemStatus>
 *   options={[
 *     { value: '', label: 'All', count: 100 },
 *     { value: 'approved', label: 'Approved', count: 50 },
 *     { value: 'pending', label: 'Pending', count: 30 },
 *   ]}
 *   value={statusFilter}
 *   onChange={setStatusFilter}
 * />
 * ```
 */
export function AdminStatusTabs<T extends string = string>({
	options,
	value,
	onChange,
	className,
	size = 'md',
	showCounts = true,
}: AdminStatusTabsProps<T>) {
	const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
		if (e.key === 'ArrowLeft' && index > 0) {
			e.preventDefault();
			onChange(options[index - 1].value);
		} else if (e.key === 'ArrowRight' && index < options.length - 1) {
			e.preventDefault();
			onChange(options[index + 1].value);
		}
	};

	return (
		<div role="tablist" className={cn(CONTAINER_CLASSES, className)}>
			{options.map((option, index) => {
				const isActive = value === option.value;
				return (
					<button
						key={option.value || 'all'}
						type="button"
						role="tab"
						aria-selected={isActive}
						tabIndex={isActive ? 0 : -1}
						onClick={() => onChange(option.value)}
						onKeyDown={(e) => handleKeyDown(e, index)}
						className={cn(
							isActive ? TAB_ACTIVE_CLASSES : TAB_INACTIVE_CLASSES,
							SIZE_CLASSES[size]
						)}
					>
						{option.icon && <span className="mr-1">{option.icon}</span>}
						{option.label}
						{showCounts && option.count !== undefined && (
							<span className="ml-1.5 text-xs text-gray-400">{option.count}</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
