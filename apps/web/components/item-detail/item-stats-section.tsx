'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Eye, ThumbsUp, Heart, MessageSquare, Star, Clock, BarChart3 } from 'lucide-react';
import type { ItemActivityDay, ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';

/**
 * Cache-key prefix for the per-item activity payload. Exported so the vote
 * hook (and any future mutator) can target the same cache via
 * `queryClient.setQueriesData({ queryKey: [ITEM_ACTIVITY_QUERY_KEY, slug] })`
 * to apply optimistic updates without restating the literal.
 */
export const ITEM_ACTIVITY_QUERY_KEY = 'item-activity' as const;

export interface ItemActivityPayload {
	totals: ItemEngagementMetrics;
	series: ItemActivityDay[];
}

interface ItemStatsSectionProps {
	itemSlug: string;
	publishedAt?: string;
	days?: number;
}

type SeriesMetric = 'views' | 'votes' | 'favorites' | 'comments';

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

function formatRelativeAge(iso: string | undefined, locale: string): string {
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

interface StatRowProps {
	icon: React.ReactNode;
	label: string;
	value: string;
	active?: boolean;
	onSelect?: () => void;
}

function StatRow({ icon, label, value, active, onSelect }: StatRowProps) {
	const interactive = Boolean(onSelect);
	const className = `flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${
		interactive
			? `cursor-pointer ${
					active
						? 'bg-theme-primary-50 dark:bg-theme-primary-600/15 text-theme-primary-700 dark:text-theme-primary-300'
						: 'hover:bg-gray-50 dark:hover:bg-white/3'
				}`
			: ''
	}`;
	const labelClass = `flex items-center gap-1.5 text-[11px] ${
		active
			? 'text-theme-primary-700 dark:text-theme-primary-300'
			: 'text-gray-500 dark:text-gray-400'
	}`;
	const valueClass = `text-[11px] font-medium tabular-nums ${
		active
			? 'text-theme-primary-700 dark:text-theme-primary-200'
			: 'text-gray-900 dark:text-white'
	}`;
	const iconClass = active
		? 'text-theme-primary-600 dark:text-theme-primary-400 shrink-0'
		: 'text-gray-400 dark:text-gray-500 shrink-0';

	const content = (
		<>
			<span className={`${labelClass} min-w-0`}>
				<span className={iconClass}>{icon}</span>
				<span className="truncate">{label}</span>
			</span>
			<span className={`${valueClass} shrink-0`}>{value}</span>
		</>
	);

	if (interactive) {
		return (
			<button type="button" onClick={onSelect} aria-pressed={active} className={`${className} text-left`}>
				{content}
			</button>
		);
	}
	return <div className={className}>{content}</div>;
}

interface SparklineProps {
	series: ItemActivityDay[];
	metric: SeriesMetric;
}

function Sparkline({ series, metric }: SparklineProps) {
	const values = series.map((d) => d[metric]);
	// `votes` is net (upvotes - downvotes) and can be negative, so anchor the
	// scale to the actual min/max instead of assuming a non-negative range.
	const rawMax = values.length ? Math.max(...values) : 0;
	const rawMin = values.length ? Math.min(...values) : 0;
	const maxValue = Math.max(rawMax, 0);
	const minValue = Math.min(rawMin, 0);
	const range = Math.max(1, maxValue - minValue);
	const width = 400;
	const height = 56;
	const padX = 2;
	const padTop = 4;
	const padBottom = 4;
	const usableW = width - padX * 2;
	const usableH = height - padTop - padBottom;

	const points = useMemo(() => {
		if (series.length === 0) return [] as Array<{ x: number; y: number }>;
		const stepX = series.length === 1 ? 0 : usableW / (series.length - 1);
		return series.map((d, i) => ({
			x: padX + i * stepX,
			y: padTop + (1 - (d[metric] - minValue) / range) * usableH
		}));
	}, [series, metric, minValue, range, usableW, usableH]);

	if (points.length === 0) {
		return (
			<div className="h-24 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
				–
			</div>
		);
	}

	const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
	const areaPath = `${path} L${points[points.length - 1].x.toFixed(2)} ${height - padBottom} L${points[0].x.toFixed(2)} ${height - padBottom} Z`;
	const gradientId = `item-stats-sparkline-${metric}`;

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--theme-primary-500, currentColor)" stopOpacity="0.3" />
					<stop offset="100%" stopColor="var(--theme-primary-500, currentColor)" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={areaPath} fill={`url(#${gradientId})`} />
			<path
				d={path}
				fill="none"
				stroke="var(--theme-primary-600, currentColor)"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
				className="text-theme-primary-600"
			/>
		</svg>
	);
}

/**
 * Compact sidebar Statistics card with an inline sparkline.
 *
 * Renders six rows (Views / Upvotes / Favorites / Comments / Avg. rating /
 * Listed) in the same tight `text-[11px]` density as the rest of the
 * sidebar. The four chartable rows (Views, Upvotes, Favorites, Comments)
 * are clickable — selecting one highlights it with `theme-primary` and
 * re-plots the sparkline below from `/api/items/[slug]/activity`. Rating
 * and Listed rows are static.
 *
 * Data lives in the shared React Query cache under
 * `[ITEM_ACTIVITY_QUERY_KEY, itemSlug, days]` so mutations (e.g. the upvote
 * button via `useItemVote`) can patch it optimistically — the Upvotes total
 * and today's sparkline point update on the same frame as the vote.
 */
export function ItemStatsSection({ itemSlug, publishedAt, days = 30 }: ItemStatsSectionProps) {
	const t = useTranslations();
	const locale = useLocale();
	const [selected, setSelected] = useState<SeriesMetric>('views');

	const { data, isFetched: loaded } = useQuery<ItemActivityPayload>({
		queryKey: [ITEM_ACTIVITY_QUERY_KEY, itemSlug, days],
		queryFn: async () => {
			const res = await fetch(`/api/items/${encodeURIComponent(itemSlug)}/activity?days=${days}`);
			if (!res.ok) {
				throw new Error(`Activity fetch failed (${res.status})`);
			}
			return res.json() as Promise<ItemActivityPayload>;
		},
		enabled: !!itemSlug,
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30
	});

	const totals = data?.totals;
	const series = data?.series ?? [];
	const v = (n: number | undefined) => (loaded ? formatCompact(n ?? 0) : '–');

	return (
		<div className="bg-white dark:bg-white/3 rounded-xl p-3 border border-gray-200 dark:border-white/6 shadow-sm">
			<div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-gray-100 dark:border-white/6">
				<div className="p-1.5 bg-linear-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-xl">
					<BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
				</div>
				<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
					{t('itemDetail.STATISTICS', { defaultValue: 'Statistics' })}
				</h2>
			</div>

			<div className="space-y-0.5">
				<div className="grid grid-cols-2 gap-2 mb-4">
					<StatRow
						icon={<Eye className="w-3 h-3" />}
						label={t('itemDetail.STATS_VIEWS', { defaultValue: 'Views' })}
						value={v(totals?.views)}
						active={selected === 'views'}
						onSelect={() => setSelected('views')}
					/>
					<StatRow
						icon={<ThumbsUp className="w-3 h-3" />}
						label={t('itemDetail.STATS_VOTES', { defaultValue: 'Upvotes' })}
						value={v(totals?.votes)}
						active={selected === 'votes'}
						onSelect={() => setSelected('votes')}
					/>
					<StatRow
						icon={<Heart className="w-3 h-3" />}
						label={t('itemDetail.STATS_FAVORITES', { defaultValue: 'Favorites' })}
						value={v(totals?.favorites)}
						active={selected === 'favorites'}
						onSelect={() => setSelected('favorites')}
					/>
					<StatRow
						icon={<MessageSquare className="w-3 h-3" />}
						label={t('itemDetail.STATS_COMMENTS', { defaultValue: 'Comments' })}
						value={v(totals?.comments)}
						active={selected === 'comments'}
						onSelect={() => setSelected('comments')}
					/>
				</div>
				<StatRow
					icon={<Star className="w-3 h-3" />}
					label={t('itemDetail.STATS_AVG_RATING', { defaultValue: 'Avg. rating' })}
					value={loaded ? formatRating(totals?.avgRating ?? 0) : '–'}
				/>
				{publishedAt && (
					<StatRow
						icon={<Clock className="w-3 h-3" />}
						label={t('itemDetail.STATS_AGE', { defaultValue: 'Listed' })}
						value={formatRelativeAge(publishedAt, locale)}
					/>
				)}
			</div>

			<div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/6 flex">
				<Sparkline series={series} metric={selected} />
			</div>
		</div>
	);
}
