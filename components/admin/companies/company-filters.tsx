'use client';

import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type CompanyStatus = 'active' | 'inactive';

interface CompanyFiltersProps {
	statusFilter: CompanyStatus | '';
	onStatusChange: (value: CompanyStatus | '') => void;
	statusCounts: {
		total: number;
		active: number;
		inactive: number;
	};
}

// Status tab style
const STATUS_TAB = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
);

const STATUS_TAB_ACTIVE = cn(
	'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer',
	'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
);

/**
 * Company Filters Component
 * Status tabs for filtering companies - used in table header
 */
export function CompanyFilters({
	statusFilter,
	onStatusChange,
	statusCounts,
}: CompanyFiltersProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');
	const tShared = useTranslations('admin.SHARED');

	return (
		<div className="flex items-center gap-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg p-0.5">
			<button
				onClick={() => onStatusChange('')}
				className={!statusFilter ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{tShared('STATUS_ALL')}
				<span className="ml-1.5 text-xs text-gray-400">{statusCounts.total}</span>
			</button>
			<button
				onClick={() => onStatusChange('active')}
				className={statusFilter === 'active' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_ACTIVE')}
				<span className="ml-1.5 text-xs text-gray-400">{statusCounts.active}</span>
			</button>
			<button
				onClick={() => onStatusChange('inactive')}
				className={statusFilter === 'inactive' ? STATUS_TAB_ACTIVE : STATUS_TAB}
			>
				{t('STATUS_INACTIVE')}
				<span className="ml-1.5 text-xs text-gray-400">{statusCounts.inactive}</span>
			</button>
		</div>
	);
}
