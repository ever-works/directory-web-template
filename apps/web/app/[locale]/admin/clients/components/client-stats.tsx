import { Users, UserCheck, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { getTopProviderName, getTopProviderCount } from '../utils/client-helpers';

interface ClientStatsData {
	overview: {
		total: number;
		active: number;
	};
	activity: {
		newThisWeek: number;
		newThisMonth: number;
	};
	byProvider: Record<string, number>;
	growth: {
		monthlyGrowth: number;
	};
}

interface ClientStatsProps {
	stats: ClientStatsData;
}

const CARD =
	'relative bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl p-5 overflow-hidden hover:shadow-sm hover:border-gray-200 dark:hover:border-white/10 transition-all duration-200';

interface StatCardProps {
	label: string;
	value: string | number;
	sub: React.ReactNode;
	icon: React.ReactNode;
	iconClass: string;
	accentClass: string;
	children?: React.ReactNode;
}

function StatCard({ label, value, sub, icon, iconClass, accentClass, children }: StatCardProps) {
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
			<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>
		</div>
	);
}

export function ClientStats({ stats }: ClientStatsProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	const activePercentage =
		stats.overview.total > 0 ? Math.round((stats.overview.active / stats.overview.total) * 100) : 0;

	const isPositiveGrowth = stats.growth.monthlyGrowth >= 0;
	const topProviderName = getTopProviderName(stats.byProvider);
	const topProviderCount = getTopProviderCount(stats.byProvider);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

			{/* Total Clients */}
			<StatCard
				label={t('TOTAL_CLIENTS')}
				value={stats.overview.total.toLocaleString()}
				icon={<Users className="w-4 h-4" />}
				iconClass="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
				accentClass="bg-linear-to-r from-blue-500 to-blue-400"
				sub={
					stats.activity.newThisWeek > 0 ? (
						<>
							<TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
							<span className="text-emerald-600 dark:text-emerald-400 font-medium">
								+{stats.activity.newThisWeek}
							</span>
							<span>{t('THIS_WEEK')}</span>
						</>
					) : (
						<span className="text-gray-400 dark:text-gray-500">{t('THIS_WEEK')}</span>
					)
				}
			/>

			{/* Active Clients — with progress bar */}
			<div className={CARD}>
				<div className="flex items-start justify-between mb-4 pt-0.5">
					<p className="text-[11px] uppercase tracking-widest font-semibold text-gray-400 dark:text-gray-500 leading-none">
						{t('ACTIVE_CLIENTS')}
					</p>
					<div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<UserCheck className="w-4 h-4" />
					</div>
				</div>
				<p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none mb-3">
					{stats.overview.active.toLocaleString()}
				</p>
				{/* Gradient progress bar */}
				<div className="h-1 w-full bg-gray-100 dark:bg-white/6 rounded-full mb-2.5 overflow-hidden">
					<div
						className="h-full bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
						style={{ width: `${activePercentage}%` }}
					/>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
					<span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activePercentage}%</span>
					<span>{t('OF_TOTAL')}</span>
				</div>
			</div>

			{/* Top Provider */}
			<StatCard
				label={t('TOP_PROVIDER')}
				value={topProviderName}
				icon={<Globe className="w-4 h-4" />}
				iconClass="bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
				accentClass="bg-linear-to-r from-violet-500 to-violet-400"
				sub={
					<>
						<span className="text-violet-600 dark:text-violet-400 font-semibold">{topProviderCount}</span>
						<span>{t('USERS')}</span>
					</>
				}
			/>

			{/* Monthly Growth */}
			<StatCard
				label={t('MONTHLY_GROWTH')}
				value={`${isPositiveGrowth ? '+' : ''}${stats.growth.monthlyGrowth}%`}
				icon={
					isPositiveGrowth ? (
						<TrendingUp className="w-4 h-4" />
					) : (
						<TrendingDown className="w-4 h-4" />
					)
				}
				iconClass={
					isPositiveGrowth
						? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
						: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
				}
				accentClass={
					isPositiveGrowth
						? 'bg-linear-to-r from-emerald-500 to-emerald-400'
						: 'bg-linear-to-r from-red-500 to-red-400'
				}
				sub={
					<>
						{isPositiveGrowth ? (
							<TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
						) : (
							<TrendingDown className="w-3 h-3 text-red-500 shrink-0" />
						)}
						<span
							className={
								isPositiveGrowth
									? 'text-emerald-600 dark:text-emerald-400 font-semibold'
									: 'text-red-600 dark:text-red-400 font-semibold'
							}
						>
							{stats.activity.newThisMonth}
						</span>
						<span>{t('NEW_CLIENTS')}</span>
					</>
				}
			/>
		</div>
	);
}
