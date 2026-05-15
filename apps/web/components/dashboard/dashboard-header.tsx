'use client';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/header/avatar';
import Link from 'next/link';

export type Period = '7d' | '30d' | '90d';

interface DashboardHeaderProps {
	session: Session | null;
	period: Period;
	onPeriodChange: (period: Period) => void;
	onRefresh: () => void;
	isRefreshing?: boolean;
}

const PERIODS: { value: Period; label: string }[] = [
	{ value: '7d', label: '7d' },
	{ value: '30d', label: '30d' },
	{ value: '90d', label: '90d' },
];

function getGreeting(): 'MORNING' | 'AFTERNOON' | 'EVENING' {
	const hour = new Date().getHours();
	if (hour < 12) return 'MORNING';
	if (hour < 18) return 'AFTERNOON';
	return 'EVENING';
}

export function DashboardHeader({ session, period, onPeriodChange, onRefresh, isRefreshing }: DashboardHeaderProps) {
	const t = useTranslations('client.dashboard');
	const locale = useLocale();
	const greetingKey = getGreeting();
	const name = session?.user?.name?.split(' ')[0] ?? t('USER_FALLBACK');

	return (
		<header className="mb-6">
			{/* Top row: avatar + greeting + actions */}
			<div className="flex items-start justify-between gap-4 mb-4">
				<div className="flex items-center gap-3 min-w-0">
					<Avatar
						src={session?.user?.image}
						alt={session?.user?.name || 'User'}
						fallback={session?.user?.name?.[0] || 'U'}
						size="md"
						className="shrink-0 ring-1 ring-neutral-200 dark:ring-white/10 rounded-full"
					/>
					<div className="min-w-0">
						<h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight truncate">
							{t(`GREETING.${greetingKey}`, { name })}
						</h1>
						<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
							{t('HEADER_SUBTITLE')}
						</p>
					</div>
				</div>

				{/* Desktop actions */}
				<div className="hidden sm:flex items-center gap-2 shrink-0">
					<Button
						onClick={onRefresh}
						variant="outline"
						size="sm"
						disabled={isRefreshing}
						className="flex items-center gap-1.5 h-8 px-3 text-xs border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6"
						aria-label={t('REFRESH')}
					>
						<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
						<span>{t('REFRESH')}</span>
					</Button>
					<Link
						href={`/${locale}/submit`}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						{t('NEW_SUBMISSION')}
					</Link>
				</div>
			</div>

			{/* Bottom row: period tabs + mobile actions */}
			<div className="flex items-center justify-between gap-3">
				{/* Period tabs */}
				<div
					role="tablist"
					aria-label={t('PERIOD_LABEL')}
					className="flex items-center gap-1 bg-neutral-100 dark:bg-white/6 rounded-lg p-1"
				>
					{PERIODS.map(({ value, label }) => (
						<button
							key={value}
							role="tab"
							aria-selected={period === value}
							onClick={() => onPeriodChange(value)}
							className={`
								px-3 py-1 text-xs font-medium rounded-md transition-all duration-150
								${
									period === value
										? 'bg-white dark:bg-white/12 text-neutral-900 dark:text-white shadow-sm'
										: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
								}
							`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Mobile actions */}
				<div className="flex sm:hidden items-center gap-2">
					<Button
						onClick={onRefresh}
						variant="outline"
						size="sm"
						disabled={isRefreshing}
						className="h-8 w-8 p-0 border-neutral-200 dark:border-white/10"
						aria-label={t('REFRESH')}
					>
						<RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
					</Button>
					<Link
						href={`/${locale}/submit`}
						aria-label={t('NEW_SUBMISSION')}
						className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
					</Link>
				</div>
			</div>
		</header>
	);
}
