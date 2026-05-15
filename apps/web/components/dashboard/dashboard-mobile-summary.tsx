'use client';

import { useTranslations } from 'next-intl';
import { MessageSquare, TrendingUp, ThumbsUp, Activity } from 'lucide-react';
import type { UserStats } from '@/hooks/use-dashboard-stats';

interface DashboardMobileSummaryProps {
	stats: UserStats | undefined;
}

interface KPI {
	icon: React.ElementType;
	valueKey: keyof Pick<UserStats, 'totalSubmissions' | 'totalViews' | 'totalVotesReceived' | 'totalCommentsReceived'>;
	labelKey: string;
	color: string;
}

const KPIS: KPI[] = [
	{ icon: MessageSquare, valueKey: 'totalSubmissions', labelKey: 'STATS.TOTAL_SUBMISSIONS', color: 'text-sky-500' },
	{ icon: TrendingUp, valueKey: 'totalViews', labelKey: 'STATS.TOTAL_VIEWS', color: 'text-violet-500' },
	{ icon: ThumbsUp, valueKey: 'totalVotesReceived', labelKey: 'STATS.VOTES_RECEIVED', color: 'text-emerald-500' },
	{ icon: Activity, valueKey: 'totalCommentsReceived', labelKey: 'STATS.COMMENTS_RECEIVED', color: 'text-amber-500' },
];

export function DashboardMobileSummary({ stats }: DashboardMobileSummaryProps) {
	const t = useTranslations('client.dashboard');

	return (
		<div className="sm:hidden sticky top-0 z-20 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-white/8 -mx-4 px-4 py-2.5 mb-4">
			<div className="grid grid-cols-4 gap-2">
				{KPIS.map(({ icon: Icon, valueKey, labelKey, color }) => {
					const value = stats?.[valueKey];
					return (
						<div key={valueKey} className="flex flex-col items-center gap-0.5">
							<Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
							<span className="text-sm font-semibold text-neutral-900 dark:text-white leading-none">
								{value === undefined ? (
									<span className="inline-block h-4 w-6 bg-neutral-200 dark:bg-white/10 rounded animate-pulse" />
								) : (
									value.toLocaleString()
								)}
							</span>
							<span className="text-[9px] text-neutral-500 dark:text-neutral-400 text-center leading-tight">
								{t(labelKey).split(' ').slice(-1)[0]}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
