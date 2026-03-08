'use client';

import { useTranslations } from 'next-intl';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { EngagementDistributionData } from '@/hooks/use-dashboard-stats';
import { CARD_BASE_STYLES, TITLE_STYLES, SUBTITLE_STYLES, VALUE_STYLES, TOOLTIP_STYLES, CHART_COLORS } from './styles';

interface EngagementDistributionProps {
	data: EngagementDistributionData[];
	isLoading?: boolean;
}

export function EngagementDistribution({ data, isLoading = false }: EngagementDistributionProps) {
	const t = useTranslations('client.dashboard.ENGAGEMENT_DISTRIBUTION');

	if (isLoading) {
		return (
			<div className={CARD_BASE_STYLES}>
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-4 w-1/3"></div>
					<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-sm"></div>
				</div>
			</div>
		);
	}

	if (!data || data.length === 0) {
		return (
			<div className={CARD_BASE_STYLES}>
				<h3 className={TITLE_STYLES}>{t('TITLE')}</h3>
				<p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('NO_DATA')}</p>
				<p className={`${SUBTITLE_STYLES} text-center`}>{t('NO_DATA_DESC')}</p>
			</div>
		);
	}

	const chartData = data.map((item) => ({
		...item,
		displayTitle: item.title.length > 20 ? `${item.title.substring(0, 20)}...` : item.title
	}));

	const totalEngagement = data.reduce((sum, item) => sum + item.engagement, 0);
	const topItemPercentage = data[0]?.percentage || 0;

	return (
		<section className={CARD_BASE_STYLES} aria-labelledby="engagement-distribution-title">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h3 id="engagement-distribution-title" className={TITLE_STYLES}>
						{t('TITLE')}
					</h3>
					<p className={SUBTITLE_STYLES}>{t('SUBTITLE')}</p>
				</div>
				<div className="text-right">
					<div className={VALUE_STYLES}>{totalEngagement}</div>
					<div className="text-xs text-gray-500 dark:text-gray-400">{t('ENGAGEMENT')}</div>
				</div>
			</div>
			<ResponsiveContainer width="100%" height={250}>
				<BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--tw-prose-hr, #e5e7eb)"
						horizontal={true}
						vertical={false}
					/>
					<XAxis type="number" stroke="#6B7280" fontSize={12} />
					<YAxis type="category" dataKey="displayTitle" stroke="#6B7280" fontSize={11} width={120} />
					<Tooltip
						contentStyle={TOOLTIP_STYLES}
						formatter={(value) => [value, t('ENGAGEMENT')]}
						labelFormatter={(label) => {
							// Find exact match in chartData using displayTitle (which matches the label from YAxis)
							const item = chartData.find((d) => d.displayTitle === String(label));
							return item ? item.title : String(label);
						}}
					/>
					<Bar dataKey="engagement" radius={[0, 4, 4, 0]}>
						{chartData.map((_, index) => (
							<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
			<div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<div className="flex items-center justify-between text-sm">
					<span className="text-gray-600 dark:text-gray-400">#1 {t('OF_TOTAL')}</span>
					<span className="font-medium text-gray-900 dark:text-gray-100">
						{topItemPercentage.toFixed(1)}%
					</span>
				</div>
				<div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
					<div
						className="h-full bg-blue-500 rounded-full transition-all duration-300"
						style={{ width: `${topItemPercentage}%` }}
					/>
				</div>
			</div>
		</section>
	);
}
