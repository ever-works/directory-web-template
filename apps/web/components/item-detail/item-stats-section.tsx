'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, ThumbsUp, Heart, MessageSquare, Star, BarChart3 } from 'lucide-react';
import type { ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';

interface ItemStatsSectionProps {
	itemSlug: string;
	publishedAt?: string;
}

interface StatRowProps {
	icon: React.ReactNode;
	label: string;
	value: string;
}

function StatRow({ icon, label, value }: StatRowProps) {
	return (
		<div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-white/6 last:border-b-0">
			<div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
				<span className="text-gray-400 dark:text-gray-500">{icon}</span>
				<span>{label}</span>
			</div>
			<span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{value}</span>
		</div>
	);
}

function formatCompact(n: number): string {
	if (!Number.isFinite(n)) return '0';
	if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toString();
}

function formatRating(r: number): string {
	if (!r || !Number.isFinite(r)) return '–';
	return `${r.toFixed(1)} / 5`;
}

function formatRelativeAge(iso?: string, locale = 'en'): string {
	if (!iso) return '–';
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '–';
	const days = Math.max(0, Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24)));
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
	if (days < 1) return rtf.format(0, 'day');
	if (days < 30) return rtf.format(-days, 'day');
	const months = Math.floor(days / 30);
	if (months < 12) return rtf.format(-months, 'month');
	return rtf.format(-Math.floor(months / 12), 'year');
}

/**
 * Sidebar card showing engagement statistics for the current item:
 * views, votes, favorites, comments, average rating, and the time since
 * publication. Shows en-dashes until the API responds to avoid layout shift.
 */
export function ItemStatsSection({ itemSlug, publishedAt }: ItemStatsSectionProps) {
	const t = useTranslations();
	const [metrics, setMetrics] = useState<ItemEngagementMetrics | null>(null);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (!itemSlug) return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/items/engagement?slugs=${encodeURIComponent(itemSlug)}`);
				if (!res.ok) return;
				const data = (await res.json()) as { metrics?: Record<string, ItemEngagementMetrics> };
				if (cancelled) return;
				setMetrics(data.metrics?.[itemSlug] ?? null);
			} catch {
				// Silently fall back to placeholders — stats are non-critical.
			} finally {
				if (!cancelled) setLoaded(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [itemSlug]);

	const v = (n: number | undefined) => (loaded ? formatCompact(n ?? 0) : '–');

	return (
		<div className="bg-white dark:bg-white/3 rounded-xl p-4 border border-gray-200 dark:border-white/6 shadow-sm">
			<div className="flex items-center gap-4 mb-4">
				<div className="p-1.5 bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-xl">
					<BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
				</div>
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
					{t('itemDetail.STATISTICS', { defaultValue: 'Statistics' })}
				</h2>
			</div>

			<div className="space-y-0">
				<StatRow
					icon={<Eye className="w-3.5 h-3.5" />}
					label={t('itemDetail.STATS_VIEWS', { defaultValue: 'Views' })}
					value={v(metrics?.views)}
				/>
				<StatRow
					icon={<ThumbsUp className="w-3.5 h-3.5" />}
					label={t('itemDetail.STATS_VOTES', { defaultValue: 'Upvotes' })}
					value={v(metrics?.votes)}
				/>
				<StatRow
					icon={<Heart className="w-3.5 h-3.5" />}
					label={t('itemDetail.STATS_FAVORITES', { defaultValue: 'Favorites' })}
					value={v(metrics?.favorites)}
				/>
				<StatRow
					icon={<MessageSquare className="w-3.5 h-3.5" />}
					label={t('itemDetail.STATS_COMMENTS', { defaultValue: 'Comments' })}
					value={v(metrics?.comments)}
				/>
				<StatRow
					icon={<Star className="w-3.5 h-3.5" />}
					label={t('itemDetail.STATS_AVG_RATING', { defaultValue: 'Avg. rating' })}
					value={loaded ? formatRating(metrics?.avgRating ?? 0) : '–'}
				/>
				{publishedAt && (
					<StatRow
						icon={
							<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						}
						label={t('itemDetail.STATS_AGE', { defaultValue: 'Listed' })}
						value={formatRelativeAge(publishedAt)}
					/>
				)}
			</div>
		</div>
	);
}
