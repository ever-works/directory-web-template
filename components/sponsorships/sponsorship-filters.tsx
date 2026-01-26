'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslations } from 'next-intl';
import { FiSearch, FiX, FiLoader, FiChevronDown } from 'react-icons/fi';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SponsorAdStatus } from '@/lib/types/sponsor-ad';

// Filter options for sponsorship status
export type SponsorshipStatusFilter = SponsorAdStatus | 'all';
export type SponsorshipIntervalFilter = 'weekly' | 'monthly' | 'all';

export const SPONSORSHIP_STATUS_FILTERS: { value: SponsorshipStatusFilter; labelKey: string }[] = [
	{ value: 'all', labelKey: 'ALL' },
	{ value: 'active', labelKey: 'ACTIVE' },
	{ value: 'pending', labelKey: 'PENDING' },
	{ value: 'pending_payment', labelKey: 'PENDING_PAYMENT' },
	{ value: 'expired', labelKey: 'EXPIRED' },
	{ value: 'rejected', labelKey: 'REJECTED' },
	{ value: 'cancelled', labelKey: 'CANCELLED' },
];

export const SPONSORSHIP_INTERVAL_FILTERS: { value: SponsorshipIntervalFilter; labelKey: string }[] = [
	{ value: 'all', labelKey: 'ALL' },
	{ value: 'weekly', labelKey: 'WEEKLY' },
	{ value: 'monthly', labelKey: 'MONTHLY' },
];

export interface SponsorshipFiltersProps {
	status: SponsorshipStatusFilter;
	interval: SponsorshipIntervalFilter;
	search: string;
	onStatusChange: (status: SponsorshipStatusFilter) => void;
	onIntervalChange: (interval: SponsorshipIntervalFilter) => void;
	onSearchChange: (search: string) => void;
	isSearching?: boolean;
	disabled?: boolean;
}

export function SponsorshipFilters({
	status,
	interval,
	search,
	onStatusChange,
	onIntervalChange,
	onSearchChange,
	isSearching = false,
	disabled = false,
}: SponsorshipFiltersProps) {
	const t = useTranslations('client.sponsorships');
	const statusDropdownId = React.useId().replace(/:/g, '');
	const intervalDropdownId = React.useId().replace(/:/g, '');
	const currentStatusOption = SPONSORSHIP_STATUS_FILTERS.find(f => f.value === status);
	const currentIntervalOption = SPONSORSHIP_INTERVAL_FILTERS.find(f => f.value === interval);

	const handleClearSearch = () => {
		onSearchChange('');
	};

	return (
		<div className="flex flex-col sm:flex-row gap-3">
			{/* Status Filter */}
			<div className="relative">
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							aria-label={t('STATUS_FILTER')}
							aria-haspopup="menu"
							aria-controls={statusDropdownId}
							disabled={disabled}
							className={cn(
								"group inline-flex items-center justify-between",
								"w-full sm:w-40",
								"rounded-lg border border-gray-200 dark:border-gray-700",
								"bg-white dark:bg-gray-800",
								"px-3 py-2 text-sm font-medium",
								"text-gray-900 dark:text-gray-100",
								"transition-all duration-200",
								disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
							)}
						>
							<span className="truncate">
								{currentStatusOption ? t(`STATUS_${currentStatusOption.labelKey}`) : t('STATUS_ALL')}
							</span>

							<FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							id={statusDropdownId}
							align="start"
							sideOffset={6}
							className={cn(
								"z-40 w-48",
								"rounded-lg border border-gray-200 dark:border-gray-700",
								"bg-white dark:bg-gray-900",
								"shadow-lg shadow-black/10 dark:shadow-black/30",
								"animate-in fade-in zoom-in-95"
							)}
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							<DropdownMenu.RadioGroup
								value={status}
								onValueChange={(value) => onStatusChange(value as SponsorshipStatusFilter)}
								className="p-1.5"
							>
								{SPONSORSHIP_STATUS_FILTERS.map((filter) => (
									<DropdownMenu.RadioItem
										key={filter.value}
										value={filter.value}
										className={cn(
											"relative flex items-center justify-between gap-2!",
											"px-3 py-1.5 rounded-md",
											"text-sm font-medium",
											"cursor-pointer outline-hidden",
											"text-gray-900 dark:text-gray-100",
											"transition-colors",
											"hover:bg-gray-100 dark:hover:bg-gray-800",
											"focus:bg-gray-100 dark:focus:bg-gray-800"
										)}
									>
										<span>{t(`STATUS_${filter.labelKey}`)}</span>

										<DropdownMenu.ItemIndicator>
											<Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400" />
										</DropdownMenu.ItemIndicator>
									</DropdownMenu.RadioItem>
								))}
							</DropdownMenu.RadioGroup>

							<DropdownMenu.Arrow className="fill-white dark:fill-gray-900" />
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			{/* Interval Filter */}
			<div className="relative">
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button
							type="button"
							aria-label={t('INTERVAL_FILTER')}
							aria-haspopup="menu"
							aria-controls={intervalDropdownId}
							disabled={disabled}
							className={cn(
								"group inline-flex items-center justify-between",
								"w-full sm:w-36",
								"rounded-lg border border-gray-200 dark:border-gray-700",
								"bg-white dark:bg-gray-800",
								"px-3 py-2 text-sm font-medium",
								"text-gray-900 dark:text-gray-100",
								"transition-all duration-200",
								disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
							)}
						>
							<span className="truncate">
								{currentIntervalOption ? t(`INTERVAL_${currentIntervalOption.labelKey}`) : t('INTERVAL_ALL')}
							</span>

							<FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
						</button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							id={intervalDropdownId}
							align="start"
							sideOffset={6}
							className={cn(
								"z-40 min-w-36",
								"rounded-lg border border-gray-200 dark:border-gray-700",
								"bg-white dark:bg-gray-900",
								"shadow-lg shadow-black/10 dark:shadow-black/30",
								"animate-in fade-in zoom-in-95"
							)}
							onCloseAutoFocus={(e) => e.preventDefault()}
						>
							<DropdownMenu.RadioGroup
								value={interval}
								onValueChange={(value) => onIntervalChange(value as SponsorshipIntervalFilter)}
								className="p-1.5"
							>
								{SPONSORSHIP_INTERVAL_FILTERS.map((filter) => (
									<DropdownMenu.RadioItem
										key={filter.value}
										value={filter.value}
										className={cn(
											"relative flex items-center justify-between gap-2!",
											"px-3 py-1.5 rounded-md",
											"text-sm font-medium",
											"cursor-pointer outline-hidden",
											"text-gray-900 dark:text-gray-100",
											"transition-colors",
											"hover:bg-gray-100 dark:hover:bg-gray-800",
											"focus:bg-gray-100 dark:focus:bg-gray-800"
										)}
									>
										<span>{t(`INTERVAL_${filter.labelKey}`)}</span>

										<DropdownMenu.ItemIndicator>
											<Check className="h-4 w-4 text-theme-primary-500 dark:text-theme-primary-400" />
										</DropdownMenu.ItemIndicator>
									</DropdownMenu.RadioItem>
								))}
							</DropdownMenu.RadioGroup>

							<DropdownMenu.Arrow className="fill-white dark:fill-gray-900" />
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>

			{/* Search Input */}
			<div className="relative flex-1">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					{isSearching ? (
						<FiLoader className="w-4 h-4 text-gray-400 animate-spin" />
					) : (
						<FiSearch className="w-4 h-4 text-gray-400" />
					)}
				</div>
				<input
					type="text"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder={t('SEARCH_PLACEHOLDER')}
					disabled={disabled}
					className={`
						w-full pl-9 pr-9 py-2.5
						bg-white dark:bg-gray-800
						border border-gray-200 dark:border-gray-700
						rounded-lg
						text-sm text-gray-900 dark:text-gray-100
						placeholder-gray-500 dark:placeholder-gray-400
						focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-transparent
						transition-all duration-200
						${disabled ? 'opacity-50 cursor-not-allowed' : ''}
					`}
				/>
				{search && !disabled && (
					<button
						onClick={handleClearSearch}
						className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						<FiX className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}
