'use client';

import { useMemo } from 'react';
import { Card, CardBody } from '@heroui/react';
import { Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
	AdminSearchBar,
	AdminStatusTabs,
	AdminActiveFilters,
	type StatusTabOption,
	type ActiveFilter,
} from '@/components/admin/shared';

type CompanyStatus = 'active' | 'inactive';

interface CompanyFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	isSearching: boolean;
	statusFilter: CompanyStatus | '';
	onStatusChange: (value: CompanyStatus | '') => void;
	statusCounts: {
		total: number;
		active: number;
		inactive: number;
	};
	activeFilters: ActiveFilter[];
	onRemoveFilter: (filter: ActiveFilter) => void;
	onClearAllFilters: () => void;
	activeFilterCount: number;
}

export function CompanyFilters({
	searchTerm,
	onSearchChange,
	isSearching,
	statusFilter,
	onStatusChange,
	statusCounts,
	activeFilters,
	onRemoveFilter,
	onClearAllFilters,
	activeFilterCount,
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
		<Card className="mb-6 border-0 shadow-lg">
			<CardBody className="p-6">
				<div className="flex flex-col gap-4">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Filter className="w-5 h-5 text-gray-400" />
							<span className="font-medium text-gray-900 dark:text-white">
								{tShared('FILTERS')}
							</span>
							{activeFilterCount > 0 && (
								<span className="px-2 py-0.5 text-xs font-medium bg-theme-primary text-white rounded-full">
									{activeFilterCount}
								</span>
							)}
						</div>
					</div>

					{/* Search + Status Row */}
					<div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
						<div className="flex-1 min-w-[200px] w-full md:w-auto">
							<AdminSearchBar
								value={searchTerm}
								onChange={onSearchChange}
								isSearching={isSearching}
								placeholder={tShared('SEARCH_PLACEHOLDER')}
								size="md"
							/>
						</div>
						<AdminStatusTabs<CompanyStatus>
							options={statusOptions}
							value={statusFilter}
							onChange={onStatusChange}
							showCounts={true}
						/>
					</div>

					{/* Active Filters */}
					{activeFilters.length > 0 && (
						<AdminActiveFilters
							filters={activeFilters}
							onRemove={onRemoveFilter}
							onClearAll={onClearAllFilters}
							clearAllThreshold={2}
						/>
					)}
				</div>
			</CardBody>
		</Card>
	);
}
