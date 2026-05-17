"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
	Line,
	Area,
	ComposedChart,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import {
	ChartCard,
	ChartCardSkeleton,
	ChartEmptyState,
	ChartLegend,
	ChartTooltip,
	formatCompactNumber,
	useChartAxisProps,
} from "./_chart-primitives";
import { SEMANTIC_COLORS } from "./styles";

interface ActivityData {
	date: string;
	submissions: number;
	views: number;
	engagement: number;
}

interface ActivityChartProps {
	data: ActivityData[];
	isLoading?: boolean;
}

const CHART_HEIGHT = 260;

export function ActivityChart({ data, isLoading = false }: ActivityChartProps) {
	const t = useTranslations("client.dashboard.ACTIVITY_CHART");
	const gradientId = useId();
	const { gridColor, axisProps } = useChartAxisProps();

	// Validate data shape (defensive; matches previous behaviour).
	const validData = useMemo(
		() =>
			data.filter(
				(item) =>
					item &&
					typeof item.date === "string" &&
					typeof item.submissions === "number" &&
					typeof item.views === "number" &&
					typeof item.engagement === "number",
			),
		[data],
	);

	const isEmpty = useMemo(
		() => validData.every((d) => d.submissions === 0 && d.views === 0 && d.engagement === 0),
		[validData],
	);

	if (isLoading) {
		return <ChartCardSkeleton height={CHART_HEIGHT} />;
	}

	const colors = {
		submissions: SEMANTIC_COLORS.submissions,
		views: SEMANTIC_COLORS.views,
		engagement: SEMANTIC_COLORS.votes,
	};

	const legendItems = [
		{ color: colors.submissions, label: t("SUBMISSIONS_LABEL") },
		{ color: colors.views, label: t("VIEWS_LABEL") },
		{ color: colors.engagement, label: t("ENGAGEMENT_LABEL") },
	];

	return (
		<ChartCard
			title={t("TITLE")}
			subtitle={t("SUBTITLE")}
			headerRight={<ChartLegend items={legendItems} className="hidden sm:flex" />}
		>
			{/* Mobile-only legend (header version is hidden < sm to avoid wrapping) */}
			<ChartLegend items={legendItems} className="sm:hidden mb-4" />

			{isEmpty || validData.length === 0 ? (
				<ChartEmptyState
					icon={<Activity className="h-5 w-5" />}
					title={t("NO_DATA")}
					description={t("NO_DATA_DESC")}
					height={CHART_HEIGHT}
				/>
			) : (
				<ResponsiveContainer width="100%" height={CHART_HEIGHT}>
					<ComposedChart data={validData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
						<defs>
							<linearGradient id={`viewsArea-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor={colors.views} stopOpacity={0.25} />
								<stop offset="100%" stopColor={colors.views} stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
						<XAxis dataKey="date" {...axisProps} />
						<YAxis
							{...axisProps}
							allowDecimals={false}
							tickFormatter={formatCompactNumber}
							width={40}
						/>
						<Tooltip
							cursor={{ stroke: gridColor, strokeWidth: 1 }}
							content={
								<ChartTooltip
									valueFormatter={(v) => Number(v ?? 0).toLocaleString()}
								/>
							}
						/>
						{/* Views as soft area in the background */}
						<Area
							type="monotone"
							dataKey="views"
							name={t("VIEWS_LABEL")}
							stroke={colors.views}
							strokeWidth={2}
							fill={`url(#viewsArea-${gradientId})`}
							activeDot={{ r: 4, strokeWidth: 0 }}
						/>
						{/* Submissions + Engagement as crisp lines */}
						<Line
							type="monotone"
							dataKey="submissions"
							name={t("SUBMISSIONS_LABEL")}
							stroke={colors.submissions}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
						/>
						<Line
							type="monotone"
							dataKey="engagement"
							name={t("ENGAGEMENT_LABEL")}
							stroke={colors.engagement}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
						/>
					</ComposedChart>
				</ResponsiveContainer>
			)}
		</ChartCard>
	);
}
