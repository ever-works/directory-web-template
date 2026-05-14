'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, ThumbsUp, Heart, MessageSquare, Star, Calendar } from 'lucide-react';
import type { ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';

interface ActivityDay {
	date: string;
	views: number;
	votes: number;
	favorites: number;
	comments: number;
}

type SeriesMetric = 'views' | 'votes' | 'favorites' | 'comments';

interface ItemActivityOverviewProps {
	itemSlug: string;
	publishedAt?: string;
	days?: number;
}

interface TileDef {
	id: SeriesMetric | 'rating' | 'age';
	labelKey: string;
	defaultLabel: string;
	icon: React.ReactNode;
	value: string;
	chartable: boolean;
}

function formatCompact(n: number): string {
	if (!Number.isFinite(n)) return '0';
	if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toString();
}

function formatRating(r: number): string {
	if (!r || !Number.isFinite(r)) return '–';
	return r.toFixed(1);
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

function formatShortDate(iso: string): string {
	const d = new Date(iso + 'T00:00:00Z');
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

interface SparklineProps {
	series: ActivityDay[];
	metric: SeriesMetric;
}

function Sparkline({ series, metric }: SparklineProps) {
	const values = series.map((d) => d[metric]);
	const maxValue = Math.max(1, ...values);
	const width = 1000; // viewBox units; SVG stretches via width=100%
	const height = 220;
	const padX = 8;
	const padTop = 16;
	const padBottom = 28;
	const usableW = width - padX * 2;
	const usableH = height - padTop - padBottom;

	const points = useMemo(() => {
		if (series.length === 0) return [] as Array<{ x: number; y: number; v: number; date: string }>;
		const stepX = series.length === 1 ? 0 : usableW / (series.length - 1);
		return series.map((d, i) => ({
			x: padX + i * stepX,
			y: padTop + (1 - d[metric] / maxValue) * usableH,
			v: d[metric],
			date: d.date
		}));
	}, [series, metric, maxValue, usableW, usableH]);

	if (points.length === 0) {
		return (
			<div className="h-56 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
				–
			</div>
		);
	}

	const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
	const areaPath = `${path} L${points[points.length - 1].x.toFixed(2)} ${height - padBottom} L${points[0].x.toFixed(2)} ${height - padBottom} Z`;

	// Y-axis ticks (5 levels: 0, ¼, ½, ¾, max)
	const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
		y: padTop + (1 - t) * usableH,
		label: Math.round(maxValue * t).toString()
	}));

	// X-axis labels (first, ~middle, last)
	const xLabelIndices = points.length <= 1 ? [0] : [0, Math.floor(points.length / 2), points.length - 1];

	const gradientId = `activity-sparkline-fill-${metric}`;

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56" preserveAspectRatio="none">
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="var(--theme-primary-500, currentColor)" stopOpacity="0.35" />
					<stop offset="100%" stopColor="var(--theme-primary-500, currentColor)" stopOpacity="0" />
				</linearGradient>
			</defs>

			{/* Y-axis gridlines + labels */}
			{yTicks.map((t, i) => (
				<g key={i}>
					<line
						x1={padX}
						x2={width - padX}
						y1={t.y}
						y2={t.y}
						stroke="currentColor"
						strokeWidth="0.5"
						className="text-gray-200 dark:text-white/8"
					/>
					<text
						x={padX - 4}
						y={t.y}
						dy="0.35em"
						textAnchor="end"
						className="fill-current text-gray-400 dark:text-gray-500"
						fontSize="11"
					>
						{t.label}
					</text>
				</g>
			))}

			{/* Area fill */}
			<path d={areaPath} fill={`url(#${gradientId})`} />

			{/* Line */}
			<path
				d={path}
				fill="none"
				stroke="var(--theme-primary-600, currentColor)"
				strokeWidth="2.5"
				strokeLinejoin="round"
				strokeLinecap="round"
				className="text-theme-primary-600"
			/>

			{/* X-axis labels */}
			{xLabelIndices.map((idx) => (
				<text
					key={idx}
					x={points[idx].x}
					y={height - 8}
					textAnchor="middle"
					className="fill-current text-gray-500 dark:text-gray-400"
					fontSize="12"
				>
					{formatShortDate(points[idx].date)}
				</text>
			))}
		</svg>
	);
}

interface TileProps {
	def: TileDef;
	active: boolean;
	onSelect?: () => void;
}

function Tile({ def, active, onSelect }: TileProps) {
	const t = useTranslations('itemDetail');
	const label = t(def.labelKey as never, { defaultValue: def.defaultLabel } as never);

	const base =
		'flex flex-col gap-3 rounded-xl px-5 py-5 border transition-all duration-200 text-left min-w-0';
	const idle =
		'bg-white dark:bg-white/3 border-gray-200 dark:border-white/6 hover:border-gray-300 dark:hover:border-white/10';
	const activeCls =
		'bg-linear-to-br from-theme-primary-500 to-theme-primary-700 border-transparent text-white shadow-lg';

	const className = `${base} ${active ? activeCls : idle}`;

	const content = (
		<>
			<div
				className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest ${
					active ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
				}`}
			>
				<span className={active ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'}>
					{def.icon}
				</span>
				<span>{label}</span>
			</div>
			<div
				className={`text-2xl sm:text-3xl font-bold tabular-nums ${
					active ? 'text-white' : 'text-gray-900 dark:text-white'
				}`}
			>
				{def.value}
			</div>
		</>
	);

	if (onSelect) {
		return (
			<button type="button" onClick={onSelect} className={`${className} cursor-pointer`} aria-pressed={active}>
				{content}
			</button>
		);
	}
	return <div className={className}>{content}</div>;
}

/**
 * Full-width "Activity Overview" panel for /items/[slug]: six tiles
 * (Views / Upvotes / Favorites / Comments / Rating / Listed) plus a
 * sparkline driven by the selected tile. Rating and Listed are static —
 * selecting another tile keeps the chart on the last chartable metric.
 *
 * Uses the site's theme-primary tokens for the highlighted tile so it
 * adapts to whatever palette the deployment is configured with.
 */
export function ItemActivityOverview({ itemSlug, publishedAt, days = 30 }: ItemActivityOverviewProps) {
	const t = useTranslations();
	const [totals, setTotals] = useState<ItemEngagementMetrics | null>(null);
	const [series, setSeries] = useState<ActivityDay[]>([]);
	const [loaded, setLoaded] = useState(false);
	const [selected, setSelected] = useState<SeriesMetric>('views');

	useEffect(() => {
		if (!itemSlug) return;
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/items/${encodeURIComponent(itemSlug)}/activity?days=${days}`);
				if (!res.ok) return;
				const data = (await res.json()) as { totals?: ItemEngagementMetrics; series?: ActivityDay[] };
				if (cancelled) return;
				setTotals(data.totals ?? null);
				setSeries(data.series ?? []);
			} catch {
				// Non-critical; leave placeholders.
			} finally {
				if (!cancelled) setLoaded(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [itemSlug, days]);

	const v = (n: number | undefined) => (loaded ? formatCompact(n ?? 0) : '–');

	const tiles: TileDef[] = [
		{
			id: 'views',
			labelKey: 'STATS_VIEWS',
			defaultLabel: 'Views',
			icon: <Eye className="w-3.5 h-3.5" />,
			value: v(totals?.views),
			chartable: true
		},
		{
			id: 'votes',
			labelKey: 'STATS_VOTES',
			defaultLabel: 'Upvotes',
			icon: <ThumbsUp className="w-3.5 h-3.5" />,
			value: v(totals?.votes),
			chartable: true
		},
		{
			id: 'favorites',
			labelKey: 'STATS_FAVORITES',
			defaultLabel: 'Favorites',
			icon: <Heart className="w-3.5 h-3.5" />,
			value: v(totals?.favorites),
			chartable: true
		},
		{
			id: 'comments',
			labelKey: 'STATS_COMMENTS',
			defaultLabel: 'Comments',
			icon: <MessageSquare className="w-3.5 h-3.5" />,
			value: v(totals?.comments),
			chartable: true
		},
		{
			id: 'rating',
			labelKey: 'STATS_AVG_RATING',
			defaultLabel: 'Avg. rating',
			icon: <Star className="w-3.5 h-3.5" />,
			value: loaded ? formatRating(totals?.avgRating ?? 0) : '–',
			chartable: false
		},
		{
			id: 'age',
			labelKey: 'STATS_AGE',
			defaultLabel: 'Listed',
			icon: <Calendar className="w-3.5 h-3.5" />,
			value: formatRelativeAge(publishedAt),
			chartable: false
		}
	];

	return (
		<section className="rounded-2xl border border-gray-200 dark:border-white/6 bg-white dark:bg-white/3 p-6 sm:p-8 shadow-sm">
			<div className="mb-6">
				<h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
					{t('itemDetail.ACTIVITY_OVERVIEW', { defaultValue: 'Activity Overview' })}
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{t('itemDetail.ACTIVITY_OVERVIEW_DESCRIPTION', {
						defaultValue: 'Engagement over the last 30 days'
					})}
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
				{tiles.map((tile) => (
					<Tile
						key={tile.id}
						def={tile}
						active={tile.chartable && tile.id === selected}
						onSelect={
							tile.chartable
								? () => setSelected(tile.id as SeriesMetric)
								: undefined
						}
					/>
				))}
			</div>

			<Sparkline series={series} metric={selected} />
		</section>
	);
}
