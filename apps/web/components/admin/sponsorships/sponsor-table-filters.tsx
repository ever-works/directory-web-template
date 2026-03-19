'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { SponsorAdStatus, SponsorAdStats } from '@/lib/types/sponsor-ad';

interface SponsorTableFiltersProps {
	statusFilter: SponsorAdStatus | '';
	onStatusChange: (status: SponsorAdStatus | '') => void;
	stats?: SponsorAdStats | null;
}

// Status tab style (matching Items page)
const STATUS_TAB = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
);

const STATUS_TAB_ACTIVE = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm'
);

/**
 * Sponsor Table Filters Component
 * Status tabs for the table header (matches Items page pattern)
 */
export function SponsorTableFilters({ statusFilter, onStatusChange, stats }: SponsorTableFiltersProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	const totalCount = stats?.overview.total ?? 0;

	return (
		<div className="flex items-center gap-0.5 bg-gray-100/80 dark:bg-white/[0.04] rounded-lg p-0.5">
			<button
				onClick={() => onStatusChange('')}
				className={!statusFilter ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('ALL_STATUSES')}
				<span className="ml-1.5 text-xs text-gray-400">{totalCount}</span>
			</button>
			<button
				onClick={() => onStatusChange('pending_payment')}
				className={statusFilter === 'pending_payment' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_PENDING_PAYMENT')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.pendingPayment ?? 0}</span>
			</button>
			<button
				onClick={() => onStatusChange('pending')}
				className={statusFilter === 'pending' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_PENDING')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.pending ?? 0}</span>
			</button>
			<button
				onClick={() => onStatusChange('active')}
				className={statusFilter === 'active' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_ACTIVE')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.active ?? 0}</span>
			</button>
			<button
				onClick={() => onStatusChange('rejected')}
				className={statusFilter === 'rejected' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_REJECTED')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.rejected ?? 0}</span>
			</button>
			<button
				onClick={() => onStatusChange('expired')}
				className={statusFilter === 'expired' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_EXPIRED')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.expired ?? 0}</span>
			</button>
			<button
				onClick={() => onStatusChange('cancelled')}
				className={statusFilter === 'cancelled' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_CANCELLED')}
				<span className="ml-1.5 text-xs text-gray-400">{stats?.overview.cancelled ?? 0}</span>
			</button>
		</div>
	);
}
