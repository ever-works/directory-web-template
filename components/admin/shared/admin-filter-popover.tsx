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
}

// Trigger button styles
const TRIGGER_BASE_CLASSES = cn(
	'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md',
	'border border-gray-200 dark:border-gray-700',
	'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
	'transition-colors cursor-pointer'
);

// Popover content styles
const CONTENT_CLASSES = cn(
	'w-64 bg-white dark:bg-gray-900 rounded-lg shadow-xl',
	'border border-gray-200 dark:border-gray-700 z-50',
	'animate-in fade-in-0 zoom-in-95'
);

// Section search input styles
const SECTION_SEARCH_CLASSES = cn(
	'w-full pl-7 pr-2 py-1.5 text-sm rounded-md',
	'border border-gray-200 dark:border-gray-700',
	'bg-white dark:bg-gray-800',
	'text-gray-900 dark:text-white placeholder-gray-400',
	'focus:outline-none focus:border-gray-300 dark:focus:border-gray-600'
);

// Clear button styles
const CLEAR_BUTTON_CLASSES = cn(
	'flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium rounded-md',
	'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
	'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
	'transition-colors'
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
		<div className="p-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
			<label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
				{section.label}
			</label>

			{/* Section Search */}
			{section.searchable && (
				<div className="relative mt-2">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
					<input
						type="text"
						placeholder={section.searchPlaceholder || t('SEARCH_PLACEHOLDER')}
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						className={SECTION_SEARCH_CLASSES}
					/>
				</div>
			)}

			{/* Options List */}
			<div className="mt-2 space-y-0.5 max-h-36 overflow-y-auto">
				{filteredOptions.length === 0 && searchValue ? (
					<p className="text-xs text-gray-400 px-1 py-2">
						{section.noResultsMessage || t('NO_RESULTS')}
					</p>
				) : filteredOptions.length === 0 ? (
					<p className="text-xs text-gray-400 px-1 py-2">
						{section.emptyMessage || t('NO_RESULTS')}
					</p>
				) : (
					filteredOptions.map((option) => {
						const isSelected = section.selectedValues.includes(option.id);
						return (
							<label
								key={String(option.id)}
								className={cn(
									'flex items-center gap-2 px-1 py-1 rounded cursor-pointer',
									'hover:bg-gray-50 dark:hover:bg-gray-800',
									option.disabled && 'opacity-50 cursor-not-allowed'
								)}
							>
								<input
									type={section.type}
									name={section.type === 'radio' ? section.id : undefined}
									checked={isSelected}
									onChange={() => toggleOption(option.id)}
									disabled={option.disabled}
									className="w-3.5 h-3.5 rounded text-theme-primary border-gray-300 focus:ring-theme-primary"
								/>
								{option.icon && <span>{option.icon}</span>}
								<span
									className={cn(
										'text-sm',
										isSelected
											? 'text-gray-900 dark:text-white font-medium'
											: 'text-gray-600 dark:text-gray-400'
									)}
								>
									{option.label}
								</span>
								{option.count !== undefined && (
									<span className="ml-auto text-xs text-gray-400">{option.count}</span>
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
						hasActiveFilters && 'bg-gray-50 dark:bg-gray-800',
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
				<Popover.Content className={CONTENT_CLASSES} sideOffset={8} align={align}>
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
						<div className="px-3 pb-3">
							<button type="button" onClick={handleClearAll} className={CLEAR_BUTTON_CLASSES}>
								<X className="w-3.5 h-3.5" />
								<span>{t('CLEAR_ALL')}</span>
							</button>
						</div>
					)}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
