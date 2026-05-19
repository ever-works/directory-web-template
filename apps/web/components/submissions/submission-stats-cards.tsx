'use client';

import { useTranslations } from 'next-intl';
import { FiFileText, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { IconType } from 'react-icons';
import { Card, CardContent } from '@/components/ui/card';
import { ClientItemStats } from '@/lib/types/client-item';
import { cn } from '@/lib/utils';

export interface SubmissionStatsCardsProps {
	stats: ClientItemStats;
	isLoading?: boolean;
}

interface StatCardConfig {
	key: keyof ClientItemStats;
	labelKey: string;
	icon: IconType;
}

const STAT_CARDS: StatCardConfig[] = [
	{ key: 'total', labelKey: 'TOTAL_SUBMISSIONS', icon: FiFileText },
	{ key: 'approved', labelKey: 'APPROVED', icon: FiCheck },
	{ key: 'pending', labelKey: 'PENDING', icon: FiClock },
	{ key: 'rejected', labelKey: 'REJECTED', icon: FiX },
];

const ICON_BG = 'bg-gray-100 dark:bg-white/8';
const ICON_COLOR = 'text-gray-600 dark:text-gray-300';
const VALUE_COLOR = 'text-gray-900 dark:text-gray-100';
const RING_HOVER = 'group-hover:ring-gray-200 dark:group-hover:ring-white/10';

function formatPercent(part: number, total: number): string {
	if (!total) return '0%';
	const pct = Math.round((part / total) * 100);
	return `${pct}%`;
}

export function SubmissionStatsCards({ stats, isLoading = false }: SubmissionStatsCardsProps) {
	const t = useTranslations('client.submissions');

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			{STAT_CARDS.map((config) => {
				const Icon = config.icon;
				const value = stats[config.key];
				const isTotal = config.key === 'total';
				const sharePct =
					!isTotal && stats.total > 0 ? formatPercent(value, stats.total) : null;

				return (
					<Card
						key={config.key}
						className={cn(
							'group relative overflow-hidden border-gray-200 dark:border-white/8',
							'bg-white dark:bg-[#111111]',
							'ring-1 ring-transparent transition-all duration-200',
							'hover:shadow-md hover:-translate-y-px',
							RING_HOVER
						)}
					>
						<CardContent className="p-4 sm:p-5">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0 flex-1">
									<p className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
										{t(config.labelKey)}
									</p>
									{isLoading ? (
										<div className="mt-2 h-8 w-16 rounded-md bg-gray-200/70 dark:bg-white/8 animate-pulse" />
									) : (
										<div
											className={cn(
												'mt-1.5 text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight',
												VALUE_COLOR
											)}
										>
											{value.toLocaleString()}
										</div>
									)}
									{isLoading ? (
										<div className="mt-2 h-3 w-20 rounded-md bg-gray-200/70 dark:bg-white/8 animate-pulse" />
									) : (
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
											{sharePct
												? t('OF_TOTAL_PERCENT', { percent: sharePct })
												: isTotal
												? t('ALL_TIME')
												: ' '}
										</p>
									)}
								</div>
								<div
									className={cn(
										'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
										ICON_BG
									)}
								>
									<Icon className={cn('h-4 w-4', ICON_COLOR)} aria-hidden="true" />
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

export function SubmissionStatsCardsSkeleton() {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			{Array.from({ length: 4 }).map((_, index) => (
				<Card
					key={index}
					className="border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111]"
				>
					<CardContent className="p-4 sm:p-5">
						<div className="flex items-start justify-between gap-3 animate-pulse">
							<div className="min-w-0 flex-1 space-y-2">
								<div className="h-3 w-24 rounded bg-gray-200/70 dark:bg-white/8" />
								<div className="h-8 w-16 rounded bg-gray-200/70 dark:bg-white/8" />
								<div className="h-3 w-20 rounded bg-gray-200/70 dark:bg-white/8" />
							</div>
							<div className="h-9 w-9 shrink-0 rounded-lg bg-gray-200/70 dark:bg-white/8" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
