'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AdminStatusTabs, type StatusTabOption } from '@/components/admin/shared';

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

/**
 * Company Filters Component
 * Wrapper around AdminStatusTabs for filtering companies - used in table header
 */
export function CompanyFilters({
	statusFilter,
	onStatusChange,
	statusCounts,
}: CompanyFiltersProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');
	const tShared = useTranslations('admin.SHARED');

	const statusOptions: StatusTabOption<CompanyStatus>[] = useMemo(
		() => [
			{ value: '', label: tShared('STATUS_ALL'), count: statusCounts.total },
			{ value: 'active', label: t('STATUS_ACTIVE'), count: statusCounts.active },
			{ value: 'inactive', label: t('STATUS_INACTIVE'), count: statusCounts.inactive },
		],
		[t, tShared, statusCounts]
	);

	return (
		<AdminStatusTabs<CompanyStatus>
			options={statusOptions}
			value={statusFilter}
			onChange={onStatusChange}
			showCounts={true}
		/>
	);
}
