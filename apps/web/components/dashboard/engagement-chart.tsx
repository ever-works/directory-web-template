"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";
import {
	ChartCard,
	ChartCardSkeleton,
	ChartEmptyState,
	ChartLegendItem,
	ChartTooltip,
	formatCompactNumber,
} from "./_chart-primitives";

export type EngagementSliceKey = "views" | "votesReceived" | "commentsReceived";

export interface EngagementSlice {
	key: EngagementSliceKey;
	value: number;
	color: string;
}

interface EngagementChartProps {
	data: EngagementSlice[];
	isLoading?: boolean;
}

const KEY_TO_LABEL: Record<EngagementSliceKey, "VIEWS" | "VOTES_RECEIVED" | "COMMENTS_RECEIVED"> = {
	views: "VIEWS",
	votesReceived: "VOTES_RECEIVED",
	commentsReceived: "COMMENTS_RECEIVED",
};

const CHART_HEIGHT = 240;

export function EngagementChart({ data, isLoading = false }: EngagementChartProps) {
	const t = useTranslations("client.dashboard.ENGAGEMENT_CHART");

	const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
	const translated = useMemo(
		() =>
			data.map((slice) => ({
				...slice,
				name: t(KEY_TO_LABEL[slice.key]),
				percent: total > 0 ? (slice.value / total) * 100 : 0,
			})),
		[data, t, total],
	);

	if (isLoading) {
		return <ChartCardSkeleton height={CHART_HEIGHT} />;
	}

	const isEmpty = total === 0;

	return (
		<ChartCard title={t("TITLE")} subtitle={t("SUBTITLE")}>
			{isEmpty ? (
				<ChartEmptyState
					icon={<TrendingUp className="h-5 w-5" />}
					title={t("NO_DATA")}
					description={t("NO_DATA_DESC")}
					height={CHART_HEIGHT}
				/>
			) : (
				<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch sm:gap-2" style={{ minHeight: CHART_HEIGHT }}>
					{/* Donut with center total */}
					<div className="relative w-full max-w-[220px] sm:flex-1" style={{ height: CHART_HEIGHT }}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={translated}
									cx="50%"
									cy="50%"
									innerRadius={62}
									outerRadius={88}
									paddingAngle={2}
									dataKey="value"
									nameKey="name"
									stroke="none"
								>
									{translated.map((entry) => (
										<Cell key={entry.key} fill={entry.color} />
									))}
								</Pie>
								<Tooltip
									content={
										<ChartTooltip
											valueFormatter={(v, name) => {
												const slice = translated.find((s) => s.name === name);
												const num = Number(v ?? 0);
												return slice
													? `${num.toLocaleString()} (${slice.percent.toFixed(0)}%)`
													: num.toLocaleString();
											}}
										/>
									}
								/>
							</PieChart>
						</ResponsiveContainer>
						<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
							<span className="text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
								{t("TOTAL_LABEL")}
							</span>
							<span className="text-xl font-semibold text-neutral-900 dark:text-white tabular-nums">
								{formatCompactNumber(total)}
							</span>
						</div>
					</div>

					{/* Side legend */}
					<ul className="w-full sm:flex-1 sm:max-w-[220px] flex flex-col justify-center gap-2">
						{translated.map((slice) => (
							<li
								key={slice.key}
								className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
							>
								<ChartLegendItem color={slice.color} label={slice.name} />
								<div className="flex items-baseline gap-2 shrink-0 tabular-nums">
									<span className="text-sm font-semibold text-neutral-900 dark:text-white">
										{slice.value.toLocaleString()}
									</span>
									<span className="text-[11px] text-neutral-500 dark:text-neutral-400 w-10 text-right">
										{slice.percent.toFixed(0)}%
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			)}
		</ChartCard>
	);
}
