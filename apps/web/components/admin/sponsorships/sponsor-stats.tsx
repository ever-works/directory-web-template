import { Card, CardBody } from '@heroui/react';
import { Megaphone, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorAdStats } from '@/lib/types/sponsor-ad';

interface SponsorStatsProps {
	stats: SponsorAdStats | null;
}

const STAT_CARD = 'border-0 shadow-lg';
const STAT_CARD_BODY = 'p-6';
const STAT_ICON_BASE = 'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg';

/**
 * Sponsor Statistics Component
 * Displays overview statistics for sponsorships management
 */
export function SponsorStats({ stats }: SponsorStatsProps) {
	const t = useTranslations('admin.SPONSORSHIPS');

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount);
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
			{/* Total Sponsors */}
			<Card className={STAT_CARD}>
				<CardBody className={STAT_CARD_BODY}>
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('TOTAL_STAT')}</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.overview.total || 0}</p>
						</div>
						<div className={`${STAT_ICON_BASE} bg-linear-to-br from-cyan-500 to-blue-600`}>
							<Megaphone aria-hidden="true" className="w-6 h-6 text-white" />
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Pending Review */}
			<Card className={STAT_CARD}>
				<CardBody className={STAT_CARD_BODY}>
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('PENDING_STAT')}</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.overview.pending || 0}</p>
						</div>
						<div className={`${STAT_ICON_BASE} bg-linear-to-br from-yellow-500 to-orange-500`}>
							<Clock aria-hidden="true" className="w-6 h-6 text-white" />
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Active Sponsors */}
			<Card className={STAT_CARD}>
				<CardBody className={STAT_CARD_BODY}>
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('ACTIVE_STAT')}</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.overview.active || 0}</p>
						</div>
						<div className={`${STAT_ICON_BASE} bg-linear-to-br from-green-500 to-green-600`}>
							<CheckCircle aria-hidden="true" className="w-6 h-6 text-white" />
						</div>
					</div>
				</CardBody>
			</Card>

			{/* Total Revenue */}
			<Card className={STAT_CARD}>
				<CardBody className={STAT_CARD_BODY}>
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('REVENUE_STAT')}</p>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">
								{formatCurrency(stats?.revenue.totalRevenue || 0)}
							</p>
						</div>
						<div className={`${STAT_ICON_BASE} bg-linear-to-br from-emerald-500 to-emerald-600`}>
							<DollarSign aria-hidden="true" className="w-6 h-6 text-white" />
						</div>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
