"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, BadgeCheck } from "lucide-react";
import type { ApprovalTrendDataExport } from "@/hooks/use-dashboard-stats";
import {
	ChartCard,
	ChartCardSkeleton,
	ChartEmptyState,
	ChartTooltip,
	useChartAxisProps,
} from "./_chart-primitives";
import { SEMANTIC_COLORS } from "./styles";

interface ApprovalTrendProps {
	data: ApprovalTrendDataExport[];
	isLoading?: boolean;
}

const CHART_HEIGHT = 220;

export function ApprovalTrend({ data, isLoading = false }: ApprovalTrendProps) {
	const gradientId = useId();
	const t = useTranslations("client.dashboard.APPROVAL_TREND");
	const { gridColor, axisProps } = useChartAxisProps();

	const { latestRate, rateChange, totalSubmissions, totalApproved, hasAnySubmissions } = useMemo(() => {
		const latest = data[data.length - 1]?.rate ?? 0;
		const first = data[0]?.rate ?? 0;
		const sub = data.reduce((sum, item) => sum + item.total, 0);
		const app = data.reduce((sum, item) => sum + item.approved, 0);
		return {
			latestRate: latest,
			rateChange: latest - first,
			totalSubmissions: sub,
			totalApproved: app,
			hasAnySubmissions: sub > 0,
		};
	}, [data]);

	if (isLoading) {
		return <ChartCardSkeleton height={CHART_HEIGHT} hasHeaderRight />;
	}

	if (!data || data.length === 0 || !hasAnySubmissions) {
		return (
			<ChartCard title={t("TITLE")} subtitle={t("SUBTITLE")}>
				<ChartEmptyState
					icon={<BadgeCheck className="h-5 w-5" />}
					title={t("NO_DATA")}
					description={t("NO_DATA_DESC")}
					height={CHART_HEIGHT}
				/>
			</ChartCard>
		);
	}

	const lineColor = SEMANTIC_COLORS.success;
	const changeIsPositive = rateChange >= 0;
	const TrendIcon = changeIsPositive ? TrendingUp : TrendingDown;

	return (
		<ChartCard
			title={t("TITLE")}
			subtitle={t("SUBTITLE")}
			headerRight={
				<div className="flex flex-col items-end gap-0.5">
					<div className="flex items-baseline gap-1.5">
						<span className="text-xl font-semibold text-neutral-900 dark:text-white tabular-nums tracking-tight">
							{latestRate.toFixed(0)}%
						</span>
						<span
							className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
								changeIsPositive
									? "text-emerald-600 dark:text-emerald-400"
									: "text-red-500 dark:text-red-400"
							}`}
						>
							<TrendIcon className="h-3 w-3" aria-hidden="true" />
							{changeIsPositive ? "+" : ""}
							{rateChange.toFixed(0)}%
						</span>
					</div>
					<span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
						{t("APPROVAL_RATE")}
					</span>
				</div>
			}
		>
			<ResponsiveContainer width="100%" height={CHART_HEIGHT}>
				<AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
					<defs>
						<linearGradient id={`approvalGradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
							<stop offset="100%" stopColor={lineColor} stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey="month" {...axisProps} />
					<YAxis
						{...axisProps}
						domain={[0, 100]}
						tickFormatter={(value: number) => `${value}%`}
						width={40}
					/>
					<ReferenceLine y={50} stroke={gridColor} strokeDasharray="4 4" />
					<Tooltip
						cursor={{ stroke: gridColor, strokeWidth: 1 }}
						content={
							<ChartTooltip
								valueFormatter={(v) => `${Number(v ?? 0).toFixed(0)}%`}
							/>
						}
					/>
					<Area
						type="monotone"
						dataKey="rate"
						name={t("APPROVAL_RATE")}
						stroke={lineColor}
						strokeWidth={2}
						fill={`url(#approvalGradient-${gradientId})`}
						activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
					/>
				</AreaChart>
			</ResponsiveContainer>

			{/* Footer summary */}
			<div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-neutral-100 dark:border-white/[0.05]">
				<div>
					<div className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
						{t("APPROVED")}
					</div>
					<div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
						{totalApproved.toLocaleString()}
					</div>
				</div>
				<div className="text-right">
					<div className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
						{t("TOTAL")}
					</div>
					<div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">
						{totalSubmissions.toLocaleString()}
					</div>
				</div>
			</div>
		</ChartCard>
	);
}
