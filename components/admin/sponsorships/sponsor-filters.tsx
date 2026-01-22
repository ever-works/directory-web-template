import { useMemo } from 'react';
import { Input, Card, CardBody } from '@heroui/react';
import { Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AdminStatusTabs, type StatusTabOption } from '@/components/admin/shared/admin-status-tabs';
import { AdminActiveFilters, type ActiveFilter } from '@/components/admin/shared/admin-active-filters';
import type { SponsorAdStatus, SponsorAdStats } from '@/lib/types/sponsor-ad';

interface SponsorFiltersProps {
	searchTerm: string;
	statusFilter: SponsorAdStatus | '';
	onSearchChange: (value: string) => void;
	onStatusChange: (value: SponsorAdStatus | '') => void;
	onClearFilters: () => void;
	activeFilterCount: number;
	isSearching: boolean;
	stats?: SponsorAdStats | null;
}

const FILTER_CARD = 'mb-6 border-0 shadow-lg';
const FILTER_CARD_BODY = 'p-6';

/**
 * Sponsor Filters Component
 * Provides search and filter controls for sponsor ads using unified components
 */
export function SponsorFilters({
	searchTerm,
	statusFilter,
	onSearchChange,
	onStatusChange,
	onClearFilters,
	activeFilterCount,
	isSearching,
	stats,
}: SponsorFiltersProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	// Status tab options with counts from stats
	const statusOptions: StatusTabOption<SponsorAdStatus>[] = useMemo(() => [
		{ value: '', label: t('ALL_STATUSES'), count: stats?.overview.total },
		{ value: 'pending_payment', label: t('STATUS_PENDING_PAYMENT'), count: stats?.overview.pendingPayment },
		{ value: 'pending', label: t('STATUS_PENDING'), count: stats?.overview.pending },
		{ value: 'active', label: t('STATUS_ACTIVE'), count: stats?.overview.active },
		{ value: 'rejected', label: t('STATUS_REJECTED'), count: stats?.overview.rejected },
		{ value: 'expired', label: t('STATUS_EXPIRED'), count: stats?.overview.expired },
		{ value: 'cancelled', label: t('STATUS_CANCELLED'), count: stats?.overview.cancelled },
	], [t, stats]);

	// Active filters for chip display (search only - status shown in tabs)
	const activeFilters: ActiveFilter[] = useMemo(() => {
		const filters: ActiveFilter[] = [];
		if (searchTerm.trim().length >= 2) {
			filters.push({
				id: 'search',
				type: 'search',
				label: t('SEARCH'),
				value: searchTerm,
			});
		}
		return filters;
	}, [searchTerm, t]);

	// Handle removing a filter chip
	const handleRemoveFilter = (filter: ActiveFilter) => {
		if (filter.type === 'search') {
			onSearchChange('');
		}
	};

	return (
		<Card className={FILTER_CARD}>
			<CardBody className={FILTER_CARD_BODY}>
				<div className="flex flex-col gap-4">
					{/* Header row with filter icon and status tabs */}
					<div className="flex items-center justify-between flex-wrap gap-4">
						<div className="flex items-center space-x-2">
							<Filter className="w-5 h-5 text-gray-400" />
							<span className="font-medium text-gray-900 dark:text-white">{t('FILTERS')}</span>
							{activeFilterCount > 0 && (
								<span className="px-2 py-0.5 text-xs font-medium bg-theme-primary text-white rounded-full">
									{activeFilterCount}
								</span>
							)}
						</div>

						{/* Status Tabs */}
						<AdminStatusTabs<SponsorAdStatus>
							options={statusOptions}
							value={statusFilter}
							onChange={onStatusChange}
						/>
					</div>

					{/* Search input row */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							placeholder={t('SEARCH_PLACEHOLDER')}
							value={searchTerm}
							onValueChange={onSearchChange}
							startContent={<Search className="w-4 h-4 text-gray-400" />}
							endContent={
								isSearching && (
									<div className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
								)
							}
							isClearable
							onClear={() => onSearchChange('')}
							classNames={{
								input: 'text-sm',
								inputWrapper: 'h-12',
							}}
						/>
					</div>

					{/* Active Filters */}
					<AdminActiveFilters
						filters={activeFilters}
						onRemove={handleRemoveFilter}
						onClearAll={onClearFilters}
						clearAllThreshold={1}
					/>
				</div>
			</CardBody>
		</Card>
	);
}
