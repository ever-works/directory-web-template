'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslations } from 'next-intl';
import { FiSearch, FiX, FiLoader, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { Check, ChevronDown } from 'lucide-react';
import {
	CLIENT_STATUS_FILTERS,
	ClientItemsListParams,
	ClientStatusFilter,
} from '@/lib/types/client-item';
import { cn } from '@/lib/utils';

export type SubmissionSortBy = NonNullable<ClientItemsListParams['sortBy']>;
export type SubmissionSortOrder = NonNullable<ClientItemsListParams['sortOrder']>;

export interface SubmissionStatusCounts {
	all: number;
	approved: number;
	pending: number;
	rejected: number;
}

export interface SubmissionFiltersProps {
	status: ClientStatusFilter;
	search: string;
	sortBy?: SubmissionSortBy;
	sortOrder?: SubmissionSortOrder;
	onStatusChange: (status: ClientStatusFilter) => void;
	onSearchChange: (search: string) => void;
	onSortByChange?: (sortBy: SubmissionSortBy) => void;
	onSortOrderToggle?: () => void;
	isSearching?: boolean;
	disabled?: boolean;
	hideStatusTabs?: boolean;
	statusCounts?: SubmissionStatusCounts;
	onReset?: () => void;
	hasActiveFilters?: boolean;
}

const SORT_OPTIONS: { value: SubmissionSortBy; labelKey: string }[] = [
	{ value: 'updated_at', labelKey: 'SORT_RECENTLY_UPDATED' },
	{ value: 'submitted_at', labelKey: 'SORT_RECENTLY_SUBMITTED' },
	{ value: 'name', labelKey: 'SORT_TITLE' },
	{ value: 'status', labelKey: 'SORT_STATUS' },
];

export function SubmissionFilters({
	status,
	search,
	sortBy,
	sortOrder,
	onStatusChange,
	onSearchChange,
	onSortByChange,
	onSortOrderToggle,
	isSearching = false,
	disabled = false,
	hideStatusTabs = false,
	statusCounts,
	onReset,
	hasActiveFilters,
}: SubmissionFiltersProps) {
	const t = useTranslations('client.submissions');

	const handleClearSearch = () => {
		onSearchChange('');
	};

	const showSort = !!onSortByChange && !!sortBy && !!sortOrder && !!onSortOrderToggle;

	return (
		<div className="space-y-3">
			{!hideStatusTabs && (
				<StatusTabs
					status={status}
					statusCounts={statusCounts}
					disabled={disabled}
					onStatusChange={onStatusChange}
				/>
			)}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						{isSearching ? (
							<FiLoader className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
						) : (
							<FiSearch className="h-4 w-4 text-gray-400" aria-hidden="true" />
						)}
					</div>
					<input
						type="search"
						role="searchbox"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder={t('SEARCH_PLACEHOLDER')}
						disabled={disabled}
						aria-label={t('SEARCH_PLACEHOLDER')}
						className={cn(
							'w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm',
							'text-gray-900 placeholder:text-gray-400',
							'transition-colors duration-150',
							'focus:border-theme-primary-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
							'dark:border-white/8 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-500',
							'dark:focus:border-theme-primary-500 dark:focus:ring-theme-primary-500/30',
							disabled && 'cursor-not-allowed opacity-50'
						)}
					/>
					{search && !disabled && (
						<button
							type="button"
							onClick={handleClearSearch}
							aria-label={t('CLEAR_SEARCH')}
							className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
						>
							<FiX className="h-4 w-4" />
						</button>
					)}
				</div>

				{showSort && (
					<div className="flex items-center gap-1.5">
						<SortDropdown
							sortBy={sortBy}
							disabled={disabled}
							onSortByChange={onSortByChange}
						/>
						<button
							type="button"
							onClick={onSortOrderToggle}
							disabled={disabled}
							aria-label={sortOrder === 'asc' ? t('SORT_ASC') : t('SORT_DESC')}
							title={sortOrder === 'asc' ? t('SORT_ASC') : t('SORT_DESC')}
							className={cn(
								'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors',
								'hover:bg-gray-50 hover:text-gray-900',
								'focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
								'dark:border-white/8 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/8',
								disabled && 'cursor-not-allowed opacity-50'
							)}
						>
							{sortOrder === 'asc' ? (
								<FiArrowUp className="h-3.5 w-3.5" />
							) : (
								<FiArrowDown className="h-3.5 w-3.5" />
							)}
						</button>
					</div>
				)}

				{onReset && hasActiveFilters && !disabled && (
					<button
						type="button"
						onClick={onReset}
						className={cn(
							'inline-flex h-9 items-center gap-1 rounded-lg border border-transparent px-2.5 text-xs font-medium',
							'text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900',
							'focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
							'dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-100'
						)}
					>
						<FiX className="h-3 w-3" />
						{t('CLEAR_FILTERS')}
					</button>
				)}
			</div>
		</div>
	);
}

interface SortDropdownProps {
	sortBy: SubmissionSortBy;
	disabled: boolean;
	onSortByChange?: (sortBy: SubmissionSortBy) => void;
}

function SortDropdown({ sortBy, disabled, onSortByChange }: SortDropdownProps) {
	const t = useTranslations('client.submissions');
	const dropdownId = React.useId().replace(/:/g, '');

	const currentOption = SORT_OPTIONS.find((opt) => opt.value === sortBy);
	const currentLabel = currentOption ? t(currentOption.labelKey) : t('SORT_BY');

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild disabled={disabled}>
				<button
					type="button"
					aria-label={t('SORT_BY')}
					aria-haspopup="menu"
					aria-controls={dropdownId}
					className={cn(
						'group inline-flex h-9 items-center justify-between gap-2 rounded-lg px-3 text-xs font-medium',
						'min-w-[10rem] sm:min-w-[11rem]',
						'border border-gray-200 dark:border-white/8',
						'bg-white dark:bg-white/5',
						'text-gray-700 dark:text-gray-200',
						'transition-colors duration-150',
						'hover:bg-gray-50 hover:text-gray-900',
						'dark:hover:bg-white/8 dark:hover:text-gray-100',
						'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/30',
						disabled && 'cursor-not-allowed opacity-50'
					)}
				>
					<span className="truncate">{currentLabel}</span>
					<ChevronDown
						className="h-3 w-3 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-180"
						aria-hidden="true"
					/>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					id={dropdownId}
					align="end"
					sideOffset={6}
					className={cn(
						'z-50 min-w-[11rem]',
						'rounded-lg border border-gray-200 dark:border-white/8',
						'bg-white dark:bg-[#141414]',
						'shadow-lg shadow-black/10 dark:shadow-black/30',
						'animate-in fade-in zoom-in-95'
					)}
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<DropdownMenu.RadioGroup
						value={sortBy}
						onValueChange={(value) => onSortByChange?.(value as SubmissionSortBy)}
						className="p-1"
					>
						{SORT_OPTIONS.map((option) => (
							<DropdownMenu.RadioItem
								key={option.value}
								value={option.value}
								className={cn(
									'relative flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs font-medium outline-none',
									'text-gray-900 dark:text-gray-100',
									'transition-colors',
									'hover:bg-gray-100 dark:hover:bg-white/6',
									'focus:bg-gray-100 dark:focus:bg-white/6'
								)}
							>
								<span>{t(option.labelKey)}</span>
								<DropdownMenu.ItemIndicator>
									<Check
										className="h-3 w-3 text-theme-primary-500 dark:text-theme-primary-400"
										aria-hidden="true"
									/>
								</DropdownMenu.ItemIndicator>
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>
					<DropdownMenu.Arrow className="fill-white dark:fill-[#141414]" />
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

interface StatusTabsProps {
	status: ClientStatusFilter;
	statusCounts?: SubmissionStatusCounts;
	disabled: boolean;
	onStatusChange: (s: ClientStatusFilter) => void;
}

export function StatusTabs({ status, statusCounts, disabled, onStatusChange }: StatusTabsProps) {
	const tStatus = useTranslations('admin.ITEM_FORM');

	return (
		<div
			role="tablist"
			aria-label="Submission status filter"
			className="inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/50 p-1 dark:border-white/8 dark:bg-white/3 sm:w-auto"
		>
			{CLIENT_STATUS_FILTERS.map((filter) => {
				const isActive = status === filter.value;
				const count = statusCounts?.[filter.value as keyof SubmissionStatusCounts];

				return (
					<button
						key={filter.value}
						type="button"
						role="tab"
						aria-selected={isActive}
						aria-controls="submissions-list"
						onClick={() => onStatusChange(filter.value)}
						disabled={disabled}
						className={cn(
							'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40',
							isActive
								? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100'
								: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200',
							disabled && 'cursor-not-allowed opacity-50'
						)}
					>
						{tStatus(`STATUS_OPTIONS.${filter.labelKey}`)}
						{count !== undefined && (
							<span
								className={cn(
									'inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
									isActive
										? 'bg-theme-primary-100 text-theme-primary-700 dark:bg-theme-primary-900/40 dark:text-theme-primary-200'
										: 'bg-gray-200 text-gray-600 dark:bg-white/8 dark:text-gray-400'
								)}
							>
								{count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}

export function SubmissionFiltersCompact({
	status,
	search,
	onStatusChange,
	onSearchChange,
	isSearching = false,
	disabled = false,
}: Omit<SubmissionFiltersProps, 'statusCounts' | 'sortBy' | 'sortOrder' | 'onSortByChange' | 'onSortOrderToggle' | 'onReset' | 'hasActiveFilters'>) {
	const t = useTranslations('client.submissions');
	const tStatus = useTranslations('admin.ITEM_FORM');

	return (
		<div className="flex flex-col gap-2 sm:flex-row">
			<select
				value={status}
				onChange={(e) => onStatusChange(e.target.value as ClientStatusFilter)}
				disabled={disabled}
				aria-label={t('FILTER_BY_STATUS')}
				className={cn(
					'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm',
					'text-gray-900 transition-colors',
					'focus:border-theme-primary-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
					'dark:border-white/8 dark:bg-white/5 dark:text-gray-100',
					disabled && 'cursor-not-allowed opacity-50'
				)}
			>
				{CLIENT_STATUS_FILTERS.map((filter) => (
					<option key={filter.value} value={filter.value}>
						{tStatus(`STATUS_OPTIONS.${filter.labelKey}`)}
					</option>
				))}
			</select>

			<div className="relative flex-1">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					{isSearching ? (
						<FiLoader className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
					) : (
						<FiSearch className="h-4 w-4 text-gray-400" aria-hidden="true" />
					)}
				</div>
				<input
					type="search"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={t('SEARCH_PLACEHOLDER_SHORT')}
					disabled={disabled}
					aria-label={t('SEARCH_PLACEHOLDER_SHORT')}
					className={cn(
						'w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm',
						'text-gray-900 placeholder:text-gray-400',
						'focus:border-theme-primary-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/30',
						'dark:border-white/8 dark:bg-white/5 dark:text-gray-100',
						disabled && 'cursor-not-allowed opacity-50'
					)}
				/>
				{search && !disabled && (
					<button
						type="button"
						onClick={() => onSearchChange('')}
						aria-label={t('CLEAR_SEARCH')}
						className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
					>
						<FiX className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
