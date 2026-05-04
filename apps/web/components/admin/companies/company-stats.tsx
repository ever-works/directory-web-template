import { Building2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CompanyStats as Stats } from '@/hooks/use-admin-companies';

interface CompanyStatsProps {
	stats: Stats;
}

const CARD =
	'relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200';

interface StatCardProps {
	label: string;
	value: string | number;
	icon: React.ReactNode;
	iconClass: string;
	accentClass: string;
	children?: React.ReactNode;
}

function StatCard({ label, value, icon, iconClass, accentClass, children }: StatCardProps) {
	return (
		<div className={CARD}>
			<div className="flex items-start justify-between mb-4 pt-0.5">
				<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
					{label}
				</p>
				<div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm', iconClass)}>
					{icon}
				</div>
			</div>
			<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">{value}</p>
			{children}
		</div>
	);
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
			<StatCard
				label={t('TOTAL_COMPANIES')}
				value={Number(stats.total ?? 0).toLocaleString()}
				icon={<Building2 className="w-4 h-4" />}
				iconClass="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
				accentClass="bg-linear-to-r from-blue-500 to-blue-400"
			>
				<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					{t('REGISTERED_ENTITIES')}
				</div>
			</StatCard>

			{/* Active Companies — with progress bar */}
			<div className={CARD}>
				<div className="flex items-start justify-between mb-4 pt-0.5">
					<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
						{t('ACTIVE_COMPANIES')}
					</p>
					<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<CheckCircle2 className="w-4 h-4" />
					</div>
				</div>
				<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
					{Number(stats.active ?? 0).toLocaleString()}
				</p>
				{/* Gradient progress bar */}
				<div className="h-1 w-full bg-gray-100 dark:bg-white/6 rounded-full mb-2.5 overflow-hidden">
					<div
						className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
						style={{ width: `${activePercent}%` }}
					/>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activePercent}%</span>
					<span>{t('PARTICIPATION')}</span>
				</div>
			</div>

			{/* Inactive Companies */}
			<StatCard
				label={t('INACTIVE_COMPANIES')}
				value={Number(stats.inactive ?? 0).toLocaleString()}
				icon={<XCircle className="w-4 h-4" />}
				iconClass="bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400"
				accentClass="bg-linear-to-r from-gray-400 to-gray-300 dark:from-white/20 dark:to-white/10"
			>
				<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<span className="text-gray-600 dark:text-gray-400 font-semibold">{inactivePercent}%</span>
					<span>{t('DORMANT')}</span>
				</div>
			</StatCard>
		</div>
	);
}
