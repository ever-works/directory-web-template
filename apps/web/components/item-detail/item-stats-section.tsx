'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, ThumbsUp, Heart, MessageSquare, Star, Clock, BarChart3 } from 'lucide-react';
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
		<div className="flex items-center justify-between py-1.5">
			<div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
				<span className="text-gray-400 dark:text-gray-500 shrink-0">{icon}</span>
				<span>{label}</span>
			</div>
			<span className="text-[11px] font-medium text-gray-900 dark:text-white tabular-nums">{value}</span>
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
 * Compact sidebar card showing engagement statistics for the current item:
 * views, votes, favorites, comments, average rating, and listed age. Reads
 * the existing /api/items/engagement endpoint on mount; shows en-dashes
 * until the response resolves so the card height stays stable.
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
				// Non-critical; leave placeholders.
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
		<div className="bg-white dark:bg-white/3 rounded-xl p-3 border border-gray-200 dark:border-white/6 shadow-sm">
			<div className="flex items-center gap-4 mb-2">
				<div className="p-1.5 bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-xl">
					<BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
				</div>
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
					{t('itemDetail.STATISTICS', { defaultValue: 'Statistics' })}
				</h2>
			</div>

			<div>
				<StatRow
					icon={<Eye className="w-3 h-3" />}
					label={t('itemDetail.STATS_VIEWS', { defaultValue: 'Views' })}
					value={v(metrics?.views)}
				/>
				<StatRow
					icon={<ThumbsUp className="w-3 h-3" />}
					label={t('itemDetail.STATS_VOTES', { defaultValue: 'Upvotes' })}
					value={v(metrics?.votes)}
				/>
				<StatRow
					icon={<Heart className="w-3 h-3" />}
					label={t('itemDetail.STATS_FAVORITES', { defaultValue: 'Favorites' })}
					value={v(metrics?.favorites)}
				/>
				<StatRow
					icon={<MessageSquare className="w-3 h-3" />}
					label={t('itemDetail.STATS_COMMENTS', { defaultValue: 'Comments' })}
					value={v(metrics?.comments)}
				/>
				<StatRow
					icon={<Star className="w-3 h-3" />}
					label={t('itemDetail.STATS_AVG_RATING', { defaultValue: 'Avg. rating' })}
					value={loaded ? formatRating(metrics?.avgRating ?? 0) : '–'}
				/>
				{publishedAt && (
					<StatRow
						icon={<Clock className="w-3 h-3" />}
						label={t('itemDetail.STATS_AGE', { defaultValue: 'Listed' })}
						value={formatRelativeAge(publishedAt)}
					/>
				)}
			</div>
		</div>
	);
}
