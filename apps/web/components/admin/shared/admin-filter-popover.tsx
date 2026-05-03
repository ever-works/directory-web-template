'use client';

import { useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Filter, X, Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface FilterOption<T = string> {
	id: T;
	label: string;
	count?: number;
	icon?: ReactNode;
	disabled?: boolean;
}

export interface FilterSection<T = string> {
	id: string;
	label: string;
	type: 'checkbox' | 'radio';
	options: FilterOption<T>[];
	selectedValues: T[];
	onChange: (values: T[]) => void;
	searchable?: boolean;
	searchPlaceholder?: string;
	emptyMessage?: string;
	noResultsMessage?: string;
	className?: string;
}

export interface AdminFilterPopoverProps<T extends string = string> {
	sections: FilterSection<T>[];
	activeCount?: number;
	onClearAll?: () => void;
	triggerLabel?: string;
	align?: 'start' | 'center' | 'end';
	triggerClassName?: string;
	popoverClassName?: string;
}

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

	const filteredOptions = section.searchable
		? section.options.filter((opt) => opt.label.toLowerCase().includes(searchValue.toLowerCase()))
		: section.options;

	const toggleOption = (optionId: T) => {
		if (section.type === 'radio') {
			section.onChange([optionId]);
		} else {
			const isSelected = section.selectedValues.includes(optionId);
			const next = isSelected
				? section.selectedValues.filter((v) => v !== optionId)
				: [...section.selectedValues, optionId];
			section.onChange(next);
		}
	};

	return (
		<div className="px-4 py-3 border-b border-gray-100 dark:border-white/6 last:border-b-0">
			{/* Section header */}
			<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
				{section.label}
			</p>

			{/* Inline search */}
			{section.searchable && (
				<div className="relative mb-2">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
					<input
						type="text"
						placeholder={section.searchPlaceholder || t('SEARCH_PLACEHOLDER')}
						value={searchValue}
						onChange={(e) => onSearchChange(e.target.value)}
						className={cn(
							'w-full pl-7.5 pr-3 py-1.5 text-xs rounded-lg',
							'bg-gray-50/60 dark:bg-white/4 border border-gray-200 dark:border-white/10',
							'text-gray-900 dark:text-white placeholder-gray-400',
							'focus:outline-none focus:ring-2 focus:ring-theme-primary/25 focus:border-theme-primary',
							'transition-all duration-150'
						)}
					/>
				</div>
			)}

			{/* Options */}
			<div className={cn('space-y-0.5', section.className)}>
				{filteredOptions.length === 0 ? (
					<p className="py-3 text-center text-[11px] text-gray-400 dark:text-gray-500">
						{searchValue
							? (section.noResultsMessage ?? t('NO_RESULTS'))
							: (section.emptyMessage ?? t('NO_RESULTS'))}
					</p>
				) : (
					filteredOptions.map((option) => {
						const isSelected = section.selectedValues.includes(option.id);
						return (
							<label
								key={String(option.id)}
								className={cn(
									'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer select-none',
									'transition-colors duration-100',
									isSelected
										? 'bg-theme-primary/8 dark:bg-theme-primary/12'
										: 'hover:bg-gray-50 dark:hover:bg-white/6',
									option.disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
								)}
							>
								{/* Custom checkbox / radio visual */}
								<span
									className={cn(
										'shrink-0 flex items-center justify-center rounded transition-all duration-150',
										section.type === 'radio' ? 'w-3.5 h-3.5 rounded-full border-2' : 'w-3.5 h-3.5 rounded border-2',
										isSelected
											? 'bg-theme-primary border-theme-primary'
											: 'border-gray-300 dark:border-white/20 bg-white dark:bg-transparent'
									)}
								>
									{isSelected && section.type === 'checkbox' && (
										<svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="none">
											<path d="M1.5 4L3.5 6L6.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
										</svg>
									)}
									{isSelected && section.type === 'radio' && (
										<span className="w-1.5 h-1.5 rounded-full bg-white block" />
									)}
								</span>

								{/* Hidden native input for a11y */}
								<input
									type={section.type}
									name={section.type === 'radio' ? section.id : undefined}
									checked={isSelected}
									onChange={() => toggleOption(option.id)}
									disabled={option.disabled}
									className="sr-only"
								/>

								{option.icon && (
									<span className="shrink-0 text-gray-400 dark:text-gray-500">
										{option.icon}
									</span>
								)}

								<span
									className={cn(
										'flex-1 text-xs truncate leading-none',
										isSelected
											? 'text-theme-primary font-semibold'
											: 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
									)}
								>
									{option.label}
								</span>

								{option.count !== undefined && (
									<span
										className={cn(
											'shrink-0 text-[10px] tabular-nums rounded-full px-1.5 py-0.5 font-medium leading-none',
											isSelected
												? 'bg-theme-primary/15 text-theme-primary'
												: 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
										)}
									>
										{option.count}
									</span>
								)}
							</label>
						);
					})
				)}
			</div>
		</div>
	);
}

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
	const [open, setOpen] = useState(false);
	const [sectionSearches, setSectionSearches] = useState<Record<string, string>>({});

	const hasActiveFilters = activeCount > 0;

	const handleClearAll = () => {
		onClearAll?.();
		setSectionSearches({});
	};

	const getSectionSearch = (id: string) => sectionSearches[id] || '';
	const setSectionSearch = (id: string, value: string) =>
		setSectionSearches((prev) => ({ ...prev, [id]: value }));

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					className={cn(
						'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg',
						'border shadow-sm transition-all duration-150 cursor-pointer',
						hasActiveFilters
							? [
									'bg-theme-primary/8 dark:bg-theme-primary/12',
									'border-theme-primary/30 dark:border-theme-primary/25',
									'text-theme-primary',
								]
							: [
									'bg-white dark:bg-white/3',
									'border-gray-200 dark:border-white/8',
									'text-gray-600 dark:text-gray-300',
									'hover:bg-gray-50 dark:hover:bg-white/6',
									'hover:border-gray-300 dark:hover:border-white/12',
								],
						triggerClassName
					)}
				>
					<SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
					<span>{triggerLabel || t('FILTERS')}</span>
					{hasActiveFilters && (
						<span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-theme-primary text-[10px] font-bold text-white leading-none">
							{activeCount}
						</span>
					)}
				</button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					align={align}
					className={cn(
						/* Solid, opaque background */
						'bg-white dark:bg-[#121212]',
						'border border-gray-200 dark:border-white/8',
						'rounded-xl shadow-xl shadow-black/10 dark:shadow-black/60',
						/* Constrained size — never fills the screen */
						'z-50 w-72 flex flex-col',
						'max-h-[min(82vh,520px)]',
						'animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1.5',
						'data-[side=top]:slide-in-from-bottom-1.5',
						popoverClassName
					)}
				>
					{/* ── Sticky header ── */}
					<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/6 shrink-0">
						<div className="flex items-center gap-2">
							<Filter className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
							<span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
								{t('FILTERS')}
							</span>
							{hasActiveFilters && (
								<span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-theme-primary/10 dark:bg-theme-primary/20 text-[10px] font-bold text-theme-primary leading-none">
									{activeCount}
								</span>
							)}
						</div>
						<Popover.Close
							className={cn(
								'p-1 rounded-md text-gray-400 dark:text-gray-500',
								'hover:bg-gray-100 dark:hover:bg-white/8 hover:text-gray-600 dark:hover:text-gray-300',
								'transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40'
							)}
							aria-label="Close filters"
						>
							<X className="h-3.5 w-3.5" />
						</Popover.Close>
					</div>

					{/* ── Scrollable sections ── */}
					<div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
						{sections.map((section) => (
							<FilterSectionContent
								key={section.id}
								section={section}
								searchValue={getSectionSearch(section.id)}
								onSearchChange={(v) => setSectionSearch(section.id, v)}
							/>
						))}
					</div>

					{/* ── Sticky footer (only when filters are active) ── */}
					{hasActiveFilters && (
						<div className="shrink-0 px-4 py-3 border-t border-gray-100 dark:border-white/6">
							<button
								type="button"
								onClick={handleClearAll}
								className={cn(
									'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium',
									'text-gray-500 dark:text-gray-400',
									'hover:text-red-600 dark:hover:text-red-400',
									'hover:bg-red-50 dark:hover:bg-red-500/8',
									'border border-gray-200 dark:border-white/8',
									'hover:border-red-200 dark:hover:border-red-500/30',
									'transition-all duration-150'
								)}
							>
								<X className="h-3 w-3" />
								<span>{t('CLEAR_ALL')}</span>
							</button>
						</div>
					)}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
