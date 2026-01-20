'use client';

import { cn } from '@/lib/utils';
import { AdminSearchBar, type AdminSearchBarProps } from './admin-search-bar';
import { AdminStatusTabs, type StatusTabOption } from './admin-status-tabs';
import { AdminFilterPopover, type FilterSection } from './admin-filter-popover';
import { AdminActiveFilters, type ActiveFilter } from './admin-active-filters';

export interface AdminFilterToolbarProps<TStatus extends string = string> {
	// Search props (required)
	/** Current search value */
	searchValue: string;
	/** Callback when search value changes */
	onSearchChange: (value: string) => void;
	/** Whether search is in progress */
	isSearching?: boolean;
	/** Search placeholder text */
	searchPlaceholder?: string;
	/** Search bar size */
	searchSize?: AdminSearchBarProps['size'];

	// Status tabs props (optional)
	/** Status tab options */
	statusOptions?: StatusTabOption<TStatus>[];
	/** Currently selected status */
	statusValue?: TStatus | '';
	/** Callback when status changes */
	onStatusChange?: (status: TStatus | '') => void;
	/** Whether to show counts on status tabs */
	showStatusCounts?: boolean;

	// Filter popover props (optional)
	/** Filter sections for the popover */
	filterSections?: FilterSection<string>[];
	/** Number of active filters (shown in badge) */
	activeFilterCount?: number;
	/** Filter popover trigger label */
	filterLabel?: string;

	// Active filters props (optional)
	/** List of active filters to display as chips */
	activeFilters?: ActiveFilter[];
	/** Callback when a filter chip is removed */
	onRemoveFilter?: (filter: ActiveFilter) => void;

	// Shared
	/** Callback to clear all filters */
	onClearAllFilters?: () => void;

	// Layout options
	/** Layout style */
	layout?: 'inline' | 'stacked';
	/** Additional CSS classes */
	className?: string;
}

/**
 * Composition component that combines search bar, status tabs,
 * filter popover, and active filter chips.
 *
 * All sub-components except search bar are optional.
 *
 * @example
 * ```tsx
 * <AdminFilterToolbar
 *   // Search (required)
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   isSearching={isSearching}
 *   searchPlaceholder={t('SEARCH_PLACEHOLDER')}
 *
 *   // Status tabs (optional)
 *   statusOptions={statusOptions}
 *   statusValue={statusFilter}
 *   onStatusChange={setStatusFilter}
 *
 *   // Filter popover (optional)
 *   filterSections={filterSections}
 *   activeFilterCount={activeFilterCount}
 *
 *   // Active filters (optional)
 *   activeFilters={activeFilters}
 *   onRemoveFilter={handleRemoveFilter}
 *
 *   // Clear all
 *   onClearAllFilters={clearAllFilters}
 * />
 * ```
 */
export function AdminFilterToolbar<TStatus extends string = string>({
	// Search props
	searchValue,
	onSearchChange,
	isSearching,
	searchPlaceholder,
	searchSize = 'md',

	// Status tabs props
	statusOptions,
	statusValue,
	onStatusChange,
	showStatusCounts = true,

	// Filter popover props
	filterSections,
	activeFilterCount,
	filterLabel,

	// Active filters props
	activeFilters,
	onRemoveFilter,

	// Shared
	onClearAllFilters,

	// Layout
	layout = 'inline',
	className,
}: AdminFilterToolbarProps<TStatus>) {
	const hasStatusTabs = statusOptions && statusOptions.length > 0 && onStatusChange;
	const hasFilterPopover = filterSections && filterSections.length > 0;
	const hasActiveFilters = activeFilters && activeFilters.length > 0 && onRemoveFilter;

	return (
		<div className={cn('space-y-4', className)}>
			{/* Main Row: Search + Controls */}
			<div
				className={cn(
					layout === 'inline' ? 'flex items-center gap-3 flex-wrap' : 'flex flex-col gap-4'
				)}
			>
				{/* Search Bar */}
				<div className={cn(layout === 'inline' ? 'flex-1 min-w-[200px]' : 'w-full')}>
					<AdminSearchBar
						value={searchValue}
						onChange={onSearchChange}
						isSearching={isSearching}
						placeholder={searchPlaceholder}
						size={searchSize}
					/>
				</div>

				{/* Controls Row */}
				{(hasStatusTabs || hasFilterPopover) && (
					<div className="flex items-center gap-3">
						{hasStatusTabs && (
							<AdminStatusTabs
								options={statusOptions}
								value={statusValue!}
								onChange={onStatusChange}
								showCounts={showStatusCounts}
							/>
						)}

						{hasFilterPopover && (
							<AdminFilterPopover
								sections={filterSections}
								activeCount={activeFilterCount}
								onClearAll={onClearAllFilters}
								triggerLabel={filterLabel}
							/>
						)}
					</div>
				)}
			</div>

			{/* Active Filters Row */}
			{hasActiveFilters && (
				<AdminActiveFilters
					filters={activeFilters}
					onRemove={onRemoveFilter}
					onClearAll={onClearAllFilters}
				/>
			)}
		</div>
	);
}
