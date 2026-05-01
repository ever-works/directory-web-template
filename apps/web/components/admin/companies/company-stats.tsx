import { Card, CardBody } from '@heroui/react';
import { Building2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanyStats as Stats } from '@/hooks/use-admin-companies';

interface CompanyStatsProps {
	stats: Stats;
}

export function CompanyStats({ stats }: CompanyStatsProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	const activePercent =
		Number(stats.total ?? 0) > 0
			? Math.round((Number(stats.active ?? 0) / Number(stats.total ?? 0)) * 100)
			: 0;

	const inactivePercent =
		Number(stats.total ?? 0) > 0
			? Math.round((Number(stats.inactive ?? 0) / Number(stats.total ?? 0)) * 100)
			: 0;

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			{/* Total Companies */}
			<Card className="relative overflow-hidden border border-gray-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl">
				<CardBody className="p-6">
					<div className="flex items-start justify-between mb-3">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
							{t('TOTAL_COMPANIES')}
						</p>
						<div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center ring-1 ring-blue-100 dark:ring-blue-500/20 shrink-0">
							<Building2 className="w-[18px] h-[18px] text-blue-500 dark:text-blue-400" />
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
						{Number(stats.total ?? 0).toLocaleString()}
					</p>
					<p className="text-xs text-gray-500 dark:text-neutral-400">{t('REGISTERED_ENTITIES')}</p>
				</CardBody>
			</Card>

			{/* Active Companies */}
			<Card className="relative overflow-hidden border border-gray-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl">
				<CardBody className="p-6">
					<div className="flex items-start justify-between mb-3">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
							{t('ACTIVE_COMPANIES')}
						</p>
						<div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center ring-1 ring-emerald-100 dark:ring-emerald-500/20 shrink-0">
							<CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 dark:text-emerald-400" />
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
						{Number(stats.active ?? 0).toLocaleString()}
					</p>
					<div className="flex items-center gap-2">
						<span className="text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-500/20">
							{activePercent}%
						</span>
						<span className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide">
							{t('PARTICIPATION')}
						</span>
					</div>
				</CardBody>
			</Card>

			{/* Inactive Companies */}
			<Card className="relative overflow-hidden border border-gray-100 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm rounded-2xl">
				<CardBody className="p-6">
					<div className="flex items-start justify-between mb-3">
						<p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
							{t('INACTIVE_COMPANIES')}
						</p>
						<div className="w-9 h-9 bg-gray-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center ring-1 ring-gray-200 dark:ring-neutral-700 shrink-0">
							<XCircle className="w-[18px] h-[18px] text-gray-400 dark:text-neutral-400" />
						</div>
					</div>
					<p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
						{Number(stats.inactive ?? 0).toLocaleString()}
					</p>
					<div className="flex items-center gap-2">
						<span className="text-neutral-600 dark:text-neutral-400 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full text-xs ring-1 ring-inset ring-neutral-600/10 dark:ring-neutral-700">
							{inactivePercent}%
						</span>
						<span className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide">
							{t('DORMANT')}
						</span>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}