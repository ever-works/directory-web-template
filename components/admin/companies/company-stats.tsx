import { Card, CardBody } from '@heroui/react';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CompanyStats as Stats } from '@/hooks/use-admin-companies';

interface CompanyStatsProps {
	stats: Stats;
}

const STAT_CARD_WRAPPER = 'border-0 shadow-lg';
const STAT_CARD_BODY = 'p-6';
const STAT_ICON_BASE = 'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg';

/**
 * Company Statistics Component
 * Displays overview statistics for company management
 */
export function CompanyStats({ stats }: CompanyStatsProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			{/* Total Companies - Primary Gradient Card */}
			<Card className="border-0 shadow-xl shadow-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-visible relative">
				<CardBody className="p-6 relative z-10">
					<div className="flex flex-col h-full justify-between min-h-[120px]">
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-blue-100/80 mb-1">
								{t('TOTAL_COMPANIES')}
							</p>
							<p className="text-4xl font-bold text-white tracking-tight">
								{Number(stats.total ?? 0).toLocaleString()}
							</p>
						</div>
						<div className="mt-4 flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-blue-100">
								<Building2 className="w-5 h-5 opacity-80" />
								<span>{t('REGISTERED_ENTITIES')}</span>
							</div>
						</div>
					</div>
					{/* Decorative background element */}
					<div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
				</CardBody>
			</Card>

			{/* Active Companies */}
			<Card className="border-0 shadow-md bg-white dark:bg-gray-800">
				<CardBody className="p-6">
					<div className="flex flex-col h-full justify-between min-h-[120px]">
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
								{t('ACTIVE_COMPANIES')}
							</p>
							<p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
								{Number(stats.active ?? 0).toLocaleString()}
							</p>
						</div>
						<div className="mt-4">
							<div className="flex items-center gap-2">
								<span className="text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded text-xs">
									{Number(stats.total ?? 0) > 0
										? Math.round((Number(stats.active ?? 0) / Number(stats.total ?? 0)) * 100)
										: 0}
									%
								</span>
								<span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
									{t('PARTICIPATION')}
								</span>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Inactive Companies */}
			<Card className="border-0 shadow-md bg-white dark:bg-gray-800">
				<CardBody className="p-6">
					<div className="flex flex-col h-full justify-between min-h-[120px]">
						<div>
							<p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
								{t('INACTIVE_COMPANIES')}
							</p>
							<p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
								{Number(stats.inactive ?? 0).toLocaleString()}
							</p>
						</div>
						<div className="mt-4">
							<div className="flex items-center gap-2">
								<span className="text-gray-500 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
									{Number(stats.total ?? 0) > 0
										? Math.round((Number(stats.inactive ?? 0) / Number(stats.total ?? 0)) * 100)
										: 0}
									%
								</span>
								<span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
									{t('DORMANT')}
								</span>
							</div>
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
