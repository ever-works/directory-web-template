import { Card, CardBody } from '@heroui/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

// Primary card with gradient blue design (inspired by reference)
const PRIMARY_CARD =
	'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 border-0 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/10';
const DEFAULT_CARD =
	'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300';
const CARD_BODY = 'p-5';

/**
 * Client Statistics Component
 * Displays overview statistics for client management
 * Modern design inspired by budget dashboard with gradient primary card
 */
export function ClientStats({ stats }: ClientStatsProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	// Calculate percentage of active clients
	const activePercentage =
		stats.overview.total > 0 ? Math.round((stats.overview.active / stats.overview.total) * 100) : 0;

	const isPositiveGrowth = stats.growth.monthlyGrowth >= 0;

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{/* Total Clients - Primary Card with Gradient */}
			<Card className={PRIMARY_CARD}>
				<CardBody className={CARD_BODY}>
					<div className="flex flex-col">
						<p className="text-xs uppercase tracking-wider text-blue-100/80 font-medium mb-1">
							{t('TOTAL_CLIENTS')}
						</p>
						<p className="text-3xl font-bold text-white mb-2">{stats.overview.total.toLocaleString()}</p>
						<div className="flex items-center gap-2 mt-1">
							<div className="flex items-center gap-1 text-xs">
								{stats.activity.newThisWeek > 0 && <TrendingUp className="w-3 h-3 text-emerald-300" />}
								<span className="text-emerald-300 font-medium">
									{stats.activity.newThisWeek > 0 ? '+' : ''}
									{stats.activity.newThisWeek}
								</span>
								<span className="text-blue-200/60">{t('THIS_WEEK')}</span>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Active Clients */}
			<Card className={DEFAULT_CARD}>
				<CardBody className={CARD_BODY}>
					<div className="flex flex-col">
						<p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">
							{t('ACTIVE_CLIENTS')}
						</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
							{stats.overview.active.toLocaleString()}
						</p>
						<div className="flex items-center gap-1 text-xs">
							<span className="text-emerald-500 font-medium">{activePercentage}%</span>
							<span className="text-gray-400 dark:text-gray-500">{t('OF_TOTAL')}</span>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Top Provider */}
			<Card className={DEFAULT_CARD}>
				<CardBody className={CARD_BODY}>
					<div className="flex flex-col">
						<p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">
							{t('TOP_PROVIDER')}
						</p>
						<p className="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">
							{getTopProviderName(stats.byProvider)}
						</p>
						<div className="flex items-center gap-1 text-xs">
							<span className="text-blue-500 font-medium">{getTopProviderCount(stats.byProvider)}</span>
							<span className="text-gray-400 dark:text-gray-500">{t('USERS')}</span>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Growth Rate */}
			<Card className={DEFAULT_CARD}>
				<CardBody className={CARD_BODY}>
					<div className="flex flex-col">
						<p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-1">
							{t('MONTHLY_GROWTH')}
						</p>
						<p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
							{isPositiveGrowth ? '+' : ''}
							{stats.growth.monthlyGrowth}%
						</p>
						<div className="flex items-center gap-1 text-xs">
							{isPositiveGrowth ? (
								<TrendingUp className="w-3 h-3 text-emerald-500" />
							) : (
								<TrendingDown className="w-3 h-3 text-red-500" />
							)}
							<span
								className={
									isPositiveGrowth ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'
								}
							>
								{stats.activity.newThisMonth}
							</span>
							<span className="text-gray-400 dark:text-gray-500">{t('NEW_CLIENTS')}</span>
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
