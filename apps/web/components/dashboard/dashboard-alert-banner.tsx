'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { AlertTriangle, Clock, X, ChevronRight } from 'lucide-react';
import type { UserStats } from '@/hooks/use-dashboard-stats';

interface DashboardAlertBannerProps {
	stats: UserStats | undefined;
}

interface Alert {
	id: string;
	type: 'warning' | 'info';
	message: string;
	href?: string;
	linkLabel?: string;
}

const DISMISSED_KEY = 'dashboard_dismissed_alerts';

function getDismissed(): Set<string> {
	try {
		const raw = localStorage.getItem(DISMISSED_KEY);
		return new Set(raw ? JSON.parse(raw) : []);
	} catch {
		return new Set();
	}
}

function persistDismissed(ids: Set<string>) {
	try {
		localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
	} catch {
		// ignore storage errors
	}
}

export function DashboardAlertBanner({ stats }: DashboardAlertBannerProps) {
	const t = useTranslations('client.dashboard.ALERTS');
	const locale = useLocale();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setDismissed(getDismissed());
		setMounted(true);
	}, []);

	if (!stats || !mounted) return null;

	const pendingCount = stats.statusBreakdown.find((s) => s.status === 'Pending')?.value ?? 0;

	const alerts: Alert[] = [];

	if (pendingCount > 0) {
		alerts.push({
			id: `pending-${pendingCount}`,
			type: 'warning',
			message: t('PENDING_ITEMS', { count: pendingCount }),
			href: `/${locale}/client/submissions`,
			linkLabel: t('VIEW_SUBMISSIONS'),
		});
	}

	if (stats.totalSubmissions === 0) {
		alerts.push({
			id: 'no-submissions',
			type: 'info',
			message: t('NO_SUBMISSIONS'),
			href: `/${locale}/submit`,
			linkLabel: t('SUBMIT_FIRST'),
		});
	}

	const visible = alerts.filter((a) => !dismissed.has(a.id));
	if (visible.length === 0) return null;

	function dismiss(id: string) {
		setDismissed((prev) => {
			const next = new Set(prev);
			next.add(id);
			persistDismissed(next);
			return next;
		});
	}

	return (
		<div className="mb-5 flex flex-col gap-2" role="region" aria-label={t('REGION_LABEL')}>
			{visible.map((alert) => {
				const isWarning = alert.type === 'warning';
				const Icon = isWarning ? AlertTriangle : Clock;

				return (
					<div
						key={alert.id}
						role="alert"
						className={`
							flex items-center justify-between gap-3 rounded-xl border px-4 py-3
							${
								isWarning
									? 'bg-amber-50 dark:bg-amber-500/8 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300'
									: 'bg-sky-50 dark:bg-sky-500/8 border-sky-200 dark:border-sky-500/20 text-sky-800 dark:text-sky-300'
							}
						`}
					>
						<div className="flex items-center gap-2.5 min-w-0">
							<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
							<span className="text-xs font-medium truncate">{alert.message}</span>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							{alert.href && (
								<Link
									href={alert.href}
									className="flex items-center gap-0.5 text-xs font-semibold underline-offset-2 hover:underline"
								>
									{alert.linkLabel}
									<ChevronRight className="h-3 w-3" />
								</Link>
							)}
							<button
								onClick={() => dismiss(alert.id)}
								className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
								aria-label={t('DISMISS')}
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				);
			})}
		</div>
	);
}
