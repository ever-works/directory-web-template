'use client';

import { useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Filter, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface FilterOption<T = string> {
	/** Option identifier */
	id: T;
	/** Display label */
	label: string;
	/** Optional count */
	count?: number;
	/** Optional icon */
	icon?: ReactNode;
	/** Whether option is disabled */
	disabled?: boolean;
}

export interface FilterSection<T = string> {
	/** Unique section identifier */
	id: string;
	/** Section label */
	label: string;
	/** Filter type */
	type: 'checkbox' | 'radio';
	/** Available options */
	options: FilterOption<T>[];
	/** Currently selected values */
	selectedValues: T[];
	/** Callback when selection changes */
	onChange: (values: T[]) => void;
	/** Whether to show search within section */
	searchable?: boolean;
	/** Placeholder for section search */
	searchPlaceholder?: string;
	/** Empty state message when no options */
	emptyMessage?: string;
	/** Empty state message when search has no results */
	noResultsMessage?: string;
	/** Additional CSS classes for options container (e.g., grid layout) */
	className?: string;
}

export interface AdminFilterPopoverProps<T extends string = string> {
	/** Filter sections to display */
	sections: FilterSection<T>[];
	/** Number of active filters (shown in badge) */
	activeCount?: number;
	/** Callback to clear all filters */
	onClearAll?: () => void;
	/** Trigger button label */
	triggerLabel?: string;
	/** Popover placement */
	align?: 'start' | 'center' | 'end';
	/** Additional trigger button classes */
	triggerClassName?: string;
	/** Additional popover content classes (for width customization) */
	popoverClassName?: string;
}

// Trigger button styles
const TRIGGER_BASE_CLASSES = cn(
	'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
	'border border-gray-200/70 dark:border-white/5',
	'text-gray-500 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-white/4',
	'transition-all duration-150 cursor-pointer'
);

// Popover content styles
const CONTENT_CLASSES = cn(
	'bg-white dark:bg-white/4 rounded-xl shadow-lg shadow-black/5 dark:shadow-black/30',
	'border border-gray-100 dark:border-white/5 z-50',
	'animate-in fade-in-0 zoom-in-95'
);

// Section search input styles - reduced text size
const SECTION_SEARCH_CLASSES = cn(
	'w-full pl-7 pr-2 py-1 text-xs rounded-lg',
	'border border-gray-200/70 dark:border-white/5',
	'bg-white dark:bg-white/5',
	'text-gray-900 dark:text-white placeholder-gray-400 placeholder:text-xs',
	'focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors'
);

// Clear button styles - reduced text size
const CLEAR_BUTTON_CLASSES = cn(
	'flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg',
	'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
	'border border-gray-100 dark:border-white/5 hover:bg-gray-50/80 dark:hover:bg-white/4',
	'transition-all duration-150'
);

/**
 * Internal component for rendering a filter section
 */
function FilterSectionContent<T extends string>({
	section,
	searchValue,
	onSearchChange,
}: {
	section: FilterSection<T>;
	searchValue: string;
	onSearchChange: (value: string) => void;
}) {
	const t = useTranslations('admin.SHARED');

	// Filter options by search value
	const filteredOptions = section.searchable
		? section.options.filter((option) =>
				option.label.toLowerCase().includes(searchValue.toLowerCase())
			)
		: section.options;

	// Toggle option selection
	const toggleOption = (optionId: T) => {
		if (section.type === 'radio') {
			section.onChange([optionId]);
		} else {
			const isSelected = section.selectedValues.includes(optionId);
			const newValues = isSelected
				? section.selectedValues.filter((v) => v !== optionId)
				: [...section.selectedValues, optionId];
			section.onChange(newValues);
		}
	};

	return (
		<div className="px-3.5 py-3 border-b border-gray-100/80 dark:border-white/5 last:border-b-0">
			<label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2.5">
				{section.label}
			</label>

			{/* Section Search */}
			{section.searchable && (
				<div className="relative mb-1">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
					<input
						type="text"
						placeholder={section.searchPlaceholder || t('SEARCH_PLACEHOLDER')}
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						className={SECTION_SEARCH_CLASSES}
					/>
				</div>
			)}

			{/* Options Container - Force 3 columns by default */}
			<div className={cn('mt-0.5', section.className || 'grid grid-cols-3 gap-1')}>
				{filteredOptions.length === 0 && searchValue ? (
					<p className="text-[10px] text-gray-400 px-1 py-2 col-span-full">
						{section.noResultsMessage || t('NO_RESULTS')}
					</p>
				) : filteredOptions.length === 0 ? (
					<p className="text-[10px] text-gray-400 px-1 py-1 col-span-full">
						{section.emptyMessage || t('NO_RESULTS')}
					</p>
				) : (
					filteredOptions.map((option) => {
						const isSelected = section.selectedValues.includes(option.id);
						return (
							<label
								key={String(option.id)}
								className={cn(
									'flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150',
									'hover:bg-gray-50/80 dark:hover:bg-white/4',
									option.disabled && 'opacity-50 cursor-not-allowed'
								)}
							>
								<input
									type={section.type}
									name={section.type === 'radio' ? section.id : undefined}
									checked={isSelected}
									onChange={() => toggleOption(option.id)}
									disabled={option.disabled}
									className="w-3 h-3 rounded text-theme-primary border-gray-300 focus:ring-theme-primary shrink-0"
								/>
								{option.icon && <span className="shrink-0">{option.icon}</span>}
								<span
									className={cn(
										'text-xs flex-1 truncate',
										isSelected
											? 'text-gray-900 dark:text-white font-medium'
											: 'text-gray-600 dark:text-gray-400'
									)}
								>
									{option.label}
								</span>
								{option.count !== undefined && (
									<span className="ml-auto text-[10px] text-gray-400 shrink-0">{option.count}</span>
								)}
							</label>
						);
					})
				)}
			</div>
		</div>
	);
}

/**
 * Popover-based filter container component.
 * Supports multiple filter sections with internal search.
 * Filters apply immediately (no Apply/Cancel buttons).
 *
 * @example
 * ```tsx
 * const filterSections: FilterSection[] = [
 *   {
 *     id: 'categories',
 *     label: 'Categories',
 *     type: 'checkbox',
 *     options: categories.map(c => ({ id: c.id, label: c.name })),
 *     selectedValues: selectedCategories,
 *     onChange: setSelectedCategories,
 *     searchable: true,
 *   },
 * ];
 *
 * <AdminFilterPopover
 *   sections={filterSections}
 *   activeCount={activeFilterCount}
 *   onClearAll={clearAllFilters}
 * />
 * ```
 */
export function AdminFilterPopover<T extends string = string>({
	sections,
	activeCount = 0,
	onClearAll,
	triggerLabel,
	align = 'end',
	triggerClassName,
	popoverClassName,
}: AdminFilterPopoverProps<T>) {
	const t = useTranslations('admin.SHARED');
	const [sectionSearches, setSectionSearches] = useState<Record<string, string>>({});

	const hasActiveFilters = activeCount > 0;

	const handleClearAll = () => {
		onClearAll?.();
		setSectionSearches({});
	};

	const getSectionSearch = (sectionId: string) => sectionSearches[sectionId] || '';
	const setSectionSearch = (sectionId: string, value: string) => {
		setSectionSearches((prev) => ({ ...prev, [sectionId]: value }));
	};

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<button
					type="button"
					className={cn(
						TRIGGER_BASE_CLASSES,
						hasActiveFilters && 'bg-gray-50/80 dark:bg-white/5',
						triggerClassName
					)}
				>
					<Filter className="w-3.5 h-3.5" />
					<span>{triggerLabel || t('FILTERS')}</span>
					{activeCount > 0 && (
						<span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold rounded-full bg-theme-primary text-white">
							{activeCount}
						</span>
					)}
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content 
					className={cn(CONTENT_CLASSES, popoverClassName)} 
					sideOffset={8} 
					align={align}
				>
					{sections.map((section) => (
						<FilterSectionContent
							key={section.id}
							section={section}
							searchValue={getSectionSearch(section.id)}
							onSearchChange={(value) => setSectionSearch(section.id, value)}
						/>
					))}

					{/* Clear All Button */}
					{hasActiveFilters && (
						<div className="px-3.5 pb-3.5 pt-1">
							<button type="button" onClick={handleClearAll} className={CLEAR_BUTTON_CLASSES}>
								<X className="w-3 h-3" />
								<span>{t('CLEAR_ALL')}</span>
							</button>
						</div>
					)}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
