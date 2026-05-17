"use client";

/**
 * Shared chart primitives for the /client/dashboard analytics cards.
 *
 * Goal: keep all five charts (Submission Timeline, Submission Status,
 * Weekly Activity, Community Engagement, Approval Rate Trend) visually
 * consistent without each one reinventing the card chrome, tooltip,
 * skeleton, legend, or empty state.
 *
 * Kept intentionally small — only primitives that are reused by 3+ charts.
 */

import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "next-themes";

// ---- Card chrome ---------------------------------------------------------

const CARD_STYLES =
	"group relative bg-white dark:bg-white/[0.03] rounded-xl border border-neutral-200 dark:border-white/8 p-5 sm:p-6 " +
	"transition-colors duration-150 hover:border-neutral-300 dark:hover:border-white/12";

const TITLE_STYLES = "text-sm font-semibold text-neutral-900 dark:text-white tracking-tight";
const SUBTITLE_STYLES = "text-xs text-neutral-500 dark:text-neutral-400 mt-0.5";

interface ChartCardProps {
	title: string;
	subtitle?: string;
	/** Right-aligned slot for KPIs / badges in the header. */
	headerRight?: ReactNode;
	/** Optional id for `aria-labelledby` on the card region. */
	titleId?: string;
	className?: string;
	children: ReactNode;
}

export function ChartCard({ title, subtitle, headerRight, titleId, className = "", children }: ChartCardProps) {
	const id = titleId ?? `chart-${title.toLowerCase().replace(/\s+/g, "-")}-title`;
	return (
		<section className={`${CARD_STYLES} ${className}`} aria-labelledby={id}>
			<div className="flex items-start justify-between gap-4 mb-5">
				<div className="min-w-0">
					<h3 id={id} className={TITLE_STYLES}>
						{title}
					</h3>
					{subtitle && <p className={SUBTITLE_STYLES}>{subtitle}</p>}
				</div>
				{headerRight && <div className="shrink-0 text-right">{headerRight}</div>}
			</div>
			{children}
		</section>
	);
}

// ---- Skeleton ------------------------------------------------------------

interface ChartCardSkeletonProps {
	/** Pixel height of the chart body skeleton. */
	height?: number;
	/** Render a small placeholder bar where the header KPI lives. */
	hasHeaderRight?: boolean;
}

export function ChartCardSkeleton({ height = 240, hasHeaderRight = false }: ChartCardSkeletonProps) {
	return (
		<div className={CARD_STYLES} aria-busy="true" aria-live="polite">
			<div className="animate-pulse">
				<div className="flex items-start justify-between gap-4 mb-5">
					<div className="space-y-2 flex-1">
						<div className="h-3.5 w-1/3 bg-neutral-200 dark:bg-white/8 rounded-sm" />
						<div className="h-3 w-1/2 bg-neutral-100 dark:bg-white/5 rounded-sm" />
					</div>
					{hasHeaderRight && <div className="h-7 w-16 bg-neutral-200 dark:bg-white/8 rounded-sm" />}
				</div>
				<div
					className="bg-neutral-100 dark:bg-white/[0.04] rounded-lg"
					style={{ height: `${height}px` }}
				/>
			</div>
		</div>
	);
}

// ---- Empty state ---------------------------------------------------------

interface ChartEmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	/** Match the chart body height so the card doesn't collapse. */
	height?: number;
}

export function ChartEmptyState({ icon, title, description, height = 200 }: ChartEmptyStateProps) {
	return (
		<div
			className="flex flex-col items-center justify-center text-center gap-2 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-dashed border-neutral-200 dark:border-white/8 px-6"
			style={{ minHeight: `${height}px` }}
		>
			<div
				className="w-10 h-10 rounded-full bg-white dark:bg-white/[0.06] border border-neutral-200 dark:border-white/10 flex items-center justify-center text-neutral-400 dark:text-neutral-500"
				aria-hidden="true"
			>
				{icon}
			</div>
			<p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
			{description && (
				<p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">{description}</p>
			)}
		</div>
	);
}

// ---- Legend --------------------------------------------------------------

interface ChartLegendItemProps {
	color: string;
	label: string;
	/** Optional value rendered after the label in a muted tone (e.g. count or percent). */
	value?: string | number;
	className?: string;
}

export function ChartLegendItem({ color, label, value, className = "" }: ChartLegendItemProps) {
	return (
		<div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
			<span
				className="h-2 w-2 rounded-full shrink-0"
				style={{ backgroundColor: color }}
				aria-hidden="true"
			/>
			<span className="text-neutral-600 dark:text-neutral-300">{label}</span>
			{value !== undefined && (
				<span className="font-medium text-neutral-900 dark:text-white tabular-nums">{value}</span>
			)}
		</div>
	);
}

interface ChartLegendProps {
	items: { color: string; label: string; value?: string | number }[];
	className?: string;
}

export function ChartLegend({ items, className = "" }: ChartLegendProps) {
	return (
		<div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`}>
			{items.map((it) => (
				<ChartLegendItem key={it.label} {...it} />
			))}
		</div>
	);
}

// ---- KPI badge (right-side header slot) ----------------------------------

interface ChartKpiProps {
	value: string | number;
	label?: string;
	/** Optional change indicator next to the value (e.g. "+12%"). Color is set by intent. */
	change?: { value: string; positive: boolean };
}

export function ChartKpi({ value, label, change }: ChartKpiProps) {
	return (
		<div className="flex flex-col items-end gap-0.5">
			<div className="flex items-baseline gap-1.5">
				<span className="text-xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
					{value}
				</span>
				{change && (
					<span
						className={`text-[11px] font-medium tabular-nums ${
							change.positive
								? "text-emerald-600 dark:text-emerald-400"
								: "text-red-500 dark:text-red-400"
						}`}
					>
						{change.value}
					</span>
				)}
			</div>
			{label && (
				<span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
					{label}
				</span>
			)}
		</div>
	);
}

// ---- Recharts tooltip (custom, replaces the boxy default) ----------------

interface TooltipPayload {
	name?: string;
	value?: number | string;
	color?: string;
	dataKey?: string;
	payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
	active?: boolean;
	label?: string | number;
	payload?: TooltipPayload[];
	/** Format the numeric value (e.g. for percentages or thousands separators). */
	valueFormatter?: (value: number | string | undefined, name?: string) => string;
	/** Override the label shown at the top of the tooltip. */
	labelFormatter?: (label: string | number | undefined) => string;
}

export function ChartTooltip({ active, label, payload, valueFormatter, labelFormatter }: ChartTooltipProps) {
	if (!active || !payload || payload.length === 0) return null;
	const formattedLabel = labelFormatter ? labelFormatter(label) : label;
	return (
		<div
			role="tooltip"
			className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs min-w-[140px]"
		>
			{formattedLabel !== undefined && formattedLabel !== "" && (
				<div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
					{formattedLabel}
				</div>
			)}
			<div className="space-y-1">
				{payload.map((p, i) => {
					const raw = p.value;
					const formatted = valueFormatter ? valueFormatter(raw, p.name) : String(raw ?? "");
					return (
						<div key={`${p.dataKey ?? p.name ?? i}-${i}`} className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-1.5 min-w-0">
								{p.color && (
									<span
										className="h-2 w-2 rounded-full shrink-0"
										style={{ backgroundColor: p.color }}
										aria-hidden="true"
									/>
								)}
								<span className="text-neutral-600 dark:text-neutral-300 truncate">{p.name}</span>
							</div>
							<span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
								{formatted}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ---- Shared axis / grid props --------------------------------------------

/** Hook that returns axis style props matched to the active theme. */
export function useChartAxisProps() {
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";
	return {
		isDark,
		tickColor: isDark ? "#737373" : "#a3a3a3",
		gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
		axisProps: {
			tickLine: false as const,
			axisLine: false as const,
			tick: { fill: isDark ? "#737373" : "#a3a3a3", fontSize: 11 },
			stroke: isDark ? "#737373" : "#a3a3a3",
			fontSize: 11,
		},
	};
}

/** Compact number formatter for axis ticks: 1234 → "1.2k". */
export function formatCompactNumber(value: number): string {
	if (!Number.isFinite(value)) return "0";
	const abs = Math.abs(value);
	if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`.replace(".0k", "k");
	return `${Math.round(value)}`;
}

// Re-export an empty CSSProperties to satisfy strict types in consumers if needed.
export const NO_STYLE: CSSProperties = {};
