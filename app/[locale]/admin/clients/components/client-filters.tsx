import { useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
	AdminSearchBar,
	AdminStatusTabs,
	AdminFilterPopover,
	AdminActiveFilters,
	type StatusTabOption,
	type FilterSection,
	type ActiveFilter,
} from '@/components/admin/shared';
import type { DatePreset, DateFilterType, ClientStatus } from '../hooks/use-client-filters';

interface ClientFiltersProps {
	// Search
	searchTerm: string;
	onSearchChange: (value: string) => void;
	isSearching?: boolean;
	hasActiveSearch: boolean;

	// Status
	statusFilter: ClientStatus | '';
	onStatusChange: (value: ClientStatus | '') => void;

	// Multi filters
	planFilter: string;
	accountTypeFilter: string;
	providerFilter: string;
	onPlanChange: (value: string) => void;
	onAccountTypeChange: (value: string) => void;
	onProviderChange: (value: string) => void;

	// Date filters
	datePreset: DatePreset;
	customDateFrom: string;
	customDateTo: string;
	dateFilterType: DateFilterType;
	onDatePresetChange: (value: DatePreset) => void;
	onCustomDateFromChange: (value: string) => void;
	onCustomDateToChange: (value: string) => void;
	onDateFilterTypeChange: (value: DateFilterType) => void;

	// Actions
	onClearFilters: () => void;
	activeFilterCount: number;

	// Stats for counts
	stats?: {
		overview?: {
			total?: number;
			active?: number;
			inactive?: number;
			suspended?: number;
			trial?: number;
		};
	};
}

/**
 * Client Filters Component
 * Uses unified admin filter components with inline layout.
 * Row 1: Search + Status Tabs + Filter Popover
 * Row 2: Custom Date Range inputs (when datePreset === 'custom')
 * Row 3: Active Filter chips
 */
export function ClientFilters(props: ClientFiltersProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	// Destructure props for eslint exhaustive-deps
	const {
		stats,
		planFilter,
		accountTypeFilter,
		providerFilter,
		datePreset,
		dateFilterType,
		onPlanChange,
		onAccountTypeChange,
		onProviderChange,
		onDatePresetChange,
		onDateFilterTypeChange,
		onSearchChange,
		onCustomDateFromChange,
		onCustomDateToChange,
		hasActiveSearch,
		searchTerm,
		customDateFrom,
		customDateTo,
	} = props;

	// Status tabs options with counts
	const statusOptions: StatusTabOption<ClientStatus>[] = useMemo(
		() => [
			{ value: '', label: t('ALL_STATUSES'), count: stats?.overview?.total },
			{ value: 'active', label: t('ACTIVE'), count: stats?.overview?.active },
			{ value: 'inactive', label: t('INACTIVE'), count: stats?.overview?.inactive },
			{ value: 'suspended', label: t('SUSPENDED'), count: stats?.overview?.suspended },
			{ value: 'trial', label: t('TRIAL'), count: stats?.overview?.trial },
		],
		[t, stats?.overview]
	);

	// Filter sections for popover
	const filterSections: FilterSection<string>[] = useMemo(
		() => [
			{
				id: 'plan',
				label: t('PLAN'),
				type: 'radio',
				options: [
					{ id: '', label: t('ALL_PLANS') },
					{ id: 'free', label: t('FREE') },
					{ id: 'standard', label: t('STANDARD') },
					{ id: 'premium', label: t('PREMIUM') },
				],
				selectedValues: planFilter ? [planFilter] : [''],
				onChange: (values) => onPlanChange(values[0] || ''),
			},
			{
				id: 'accountType',
				label: t('ACCOUNT_TYPE'),
				type: 'radio',
				options: [
					{ id: '', label: t('ALL_TYPES') },
					{ id: 'individual', label: t('INDIVIDUAL') },
					{ id: 'business', label: t('BUSINESS') },
					{ id: 'enterprise', label: t('ENTERPRISE') },
				],
				selectedValues: accountTypeFilter ? [accountTypeFilter] : [''],
				onChange: (values) => onAccountTypeChange(values[0] || ''),
			},
			{
				id: 'provider',
				label: t('PROVIDER'),
				type: 'radio',
				options: [
					{ id: '', label: t('ALL_PROVIDERS') },
					{ id: 'credentials', label: t('EMAIL_PASSWORD') },
					{ id: 'google', label: t('GOOGLE') },
					{ id: 'github', label: t('GITHUB') },
					{ id: 'facebook', label: t('FACEBOOK') },
					{ id: 'twitter', label: t('TWITTER') },
					{ id: 'linkedin', label: t('LINKEDIN') },
				],
				selectedValues: providerFilter ? [providerFilter] : [''],
				onChange: (values) => onProviderChange(values[0] || ''),
			},
			{
				id: 'datePreset',
				label: t('DATE_RANGE'),
				type: 'radio',
				options: [
					{ id: 'all', label: t('ALL_TIME') },
					{ id: 'last7', label: t('LAST_7_DAYS') },
					{ id: 'last30', label: t('LAST_30_DAYS') },
					{ id: 'last90', label: t('LAST_90_DAYS') },
					{ id: 'thisMonth', label: t('THIS_MONTH') },
					{ id: 'custom', label: t('CUSTOM_RANGE') },
				],
				selectedValues: [datePreset],
				onChange: (values) => onDatePresetChange((values[0] as DatePreset) || 'all'),
			},
			{
				id: 'dateFilterType',
				label: t('APPLY_DATE_FILTER_TO'),
				type: 'radio',
				options: [
					{ id: 'created', label: t('CREATED_DATE') },
					{ id: 'updated', label: t('UPDATED_DATE') },
				],
				selectedValues: [dateFilterType],
				onChange: (values) => onDateFilterTypeChange((values[0] as DateFilterType) || 'created'),
			},
		],
		[
			t,
			planFilter,
			accountTypeFilter,
			providerFilter,
			datePreset,
			dateFilterType,
			onPlanChange,
			onAccountTypeChange,
			onProviderChange,
			onDatePresetChange,
			onDateFilterTypeChange,
		]
	);

	// Get label for a filter value
	const getFilterLabel = useCallback(
		(type: string, value: string): string => {
			switch (type) {
				case 'search':
					return value;
				case 'plan':
					if (value === 'free') return t('FREE');
					if (value === 'standard') return t('STANDARD');
					if (value === 'premium') return t('PREMIUM');
					return value;
				case 'accountType':
					if (value === 'individual') return t('INDIVIDUAL');
					if (value === 'business') return t('BUSINESS');
					if (value === 'enterprise') return t('ENTERPRISE');
					return value;
				case 'provider':
					if (value === 'credentials') return t('EMAIL_PASSWORD');
					if (value === 'google') return t('GOOGLE');
					if (value === 'github') return t('GITHUB');
					if (value === 'facebook') return t('FACEBOOK');
					if (value === 'twitter') return t('TWITTER');
					if (value === 'linkedin') return t('LINKEDIN');
					return value;
				case 'datePreset':
					if (value === 'last7') return t('LAST_7_DAYS_SHORT');
					if (value === 'last30') return t('LAST_30_DAYS_SHORT');
					if (value === 'last90') return t('LAST_90_DAYS_SHORT');
					if (value === 'thisMonth') return t('THIS_MONTH_SHORT');
					if (value === 'custom')
						return `${customDateFrom || '...'} - ${customDateTo || '...'}`;
					return value;
				default:
					return value;
			}
		},
		[t, customDateFrom, customDateTo]
	);

	// Build active filters array
	const activeFilters: ActiveFilter[] = useMemo(() => {
		const filters: ActiveFilter[] = [];

		if (hasActiveSearch) {
			filters.push({
				id: 'search',
				type: 'search',
				label: t('SEARCH'),
				value: `"${searchTerm}"`,
			});
		}

		if (planFilter) {
			filters.push({
				id: `plan:${planFilter}`,
				type: 'plan',
				label: t('PLAN'),
				value: getFilterLabel('plan', planFilter),
			});
		}

		if (accountTypeFilter) {
			filters.push({
				id: `accountType:${accountTypeFilter}`,
				type: 'accountType',
				label: t('ACCOUNT_TYPE'),
				value: getFilterLabel('accountType', accountTypeFilter),
			});
		}

		if (providerFilter) {
			filters.push({
				id: `provider:${providerFilter}`,
				type: 'provider',
				label: t('PROVIDER'),
				value: getFilterLabel('provider', providerFilter),
			});
		}

		if (datePreset !== 'all') {
			filters.push({
				id: `date:${datePreset}`,
				type: 'datePreset',
				label: dateFilterType === 'created' ? t('CREATED_DATE') : t('UPDATED_DATE'),
				value: getFilterLabel('datePreset', datePreset),
				icon: <Calendar className="w-3 h-3" />,
			});
		}

		return filters;
	}, [
		hasActiveSearch,
		searchTerm,
		planFilter,
		accountTypeFilter,
		providerFilter,
		datePreset,
		dateFilterType,
		t,
		getFilterLabel,
	]);

	// Handle removing individual filters
	const handleRemoveFilter = useCallback(
		(filter: ActiveFilter) => {
			switch (filter.type) {
				case 'search':
					onSearchChange('');
					break;
				case 'plan':
					onPlanChange('');
					break;
				case 'accountType':
					onAccountTypeChange('');
					break;
				case 'provider':
					onProviderChange('');
					break;
				case 'datePreset':
					onDatePresetChange('all');
					onCustomDateFromChange('');
					onCustomDateToChange('');
					break;
			}
		},
		[
			onSearchChange,
			onPlanChange,
			onAccountTypeChange,
			onProviderChange,
			onDatePresetChange,
			onCustomDateFromChange,
			onCustomDateToChange,
		]
	);

	// Calculate popover filter count (excluding search and status)
	const popoverFilterCount = useMemo(() => {
		let count = 0;
		if (planFilter) count += 1;
		if (accountTypeFilter) count += 1;
		if (providerFilter) count += 1;
		if (datePreset !== 'all') count += 1;
		return count;
	}, [planFilter, accountTypeFilter, providerFilter, datePreset]);

	return (
		<div className="mb-6 space-y-4">
			{/* Row 1: Search + Status Tabs + Filter Popover */}
			<div className="flex items-center gap-3 flex-wrap">
				{/* Search Bar */}
				<div className="flex-1 min-w-[200px]">
					<AdminSearchBar
						value={searchTerm}
						onChange={onSearchChange}
						isSearching={props.isSearching}
						placeholder={t('SEARCH_PLACEHOLDER')}
					/>
				</div>

				{/* Status Tabs */}
				<AdminStatusTabs<ClientStatus>
					options={statusOptions}
					value={props.statusFilter}
					onChange={props.onStatusChange}
				/>

				{/* Filter Popover */}
				<AdminFilterPopover
					sections={filterSections}
					activeCount={popoverFilterCount}
					onClearAll={props.onClearFilters}
					triggerLabel={t('FILTERS')}
				/>
			</div>

			{/* Row 2: Custom Date Range (when datePreset === 'custom') */}
			{datePreset === 'custom' && (
				<div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
					<Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
					<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
						{t('CUSTOM_DATE_RANGE')}:
					</span>
					<input
						type="date"
						value={customDateFrom}
						onChange={(e) => onCustomDateFromChange(e.target.value)}
						className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
						aria-label={t('FROM_DATE')}
					/>
					<span className="text-gray-400">-</span>
					<input
						type="date"
						value={customDateTo}
						onChange={(e) => onCustomDateToChange(e.target.value)}
						className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary"
						aria-label={t('TO_DATE')}
					/>
				</div>
			)}

			{/* Row 3: Active Filter Chips */}
			<AdminActiveFilters
				filters={activeFilters}
				onRemove={handleRemoveFilter}
				onClearAll={props.onClearFilters}
			/>
		</div>
	);
}
