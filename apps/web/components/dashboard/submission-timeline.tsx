"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "lucide-react";
import {
	ChartCard,
	ChartCardSkeleton,
	ChartEmptyState,
	ChartKpi,
	ChartTooltip,
	formatCompactNumber,
	useChartAxisProps,
} from "./_chart-primitives";
import { SEMANTIC_COLORS } from "./styles";

interface SubmissionTimelineData {
	month: string;
	submissions: number;
}

interface SubmissionTimelineProps {
	data: SubmissionTimelineData[];
	isLoading?: boolean;
}

const CHART_HEIGHT = 240;

export function SubmissionTimeline({ data, isLoading = false }: SubmissionTimelineProps) {
	const t = useTranslations("client.dashboard.SUBMISSION_TIMELINE");
	const gradientId = useId();
	const { isDark, gridColor, axisProps } = useChartAxisProps();

	const { total, peak, peakMonth, isEmpty } = useMemo(() => {
		const counts = data.map((d) => d.submissions);
		const totalVal = counts.reduce((sum, n) => sum + n, 0);
		const peakVal = counts.length > 0 ? Math.max(...counts) : 0;
		const peakEntry = data.find((d) => d.submissions === peakVal && peakVal > 0);
		return {
			total: totalVal,
			peak: peakVal,
			peakMonth: peakEntry?.month ?? "",
			isEmpty: totalVal === 0,
		};
	}, [data]);

	if (isLoading) {
		return <ChartCardSkeleton height={CHART_HEIGHT} hasHeaderRight />;
	}

	const barColor = SEMANTIC_COLORS.submissions;

	return (
		<ChartCard
			title={t("TITLE")}
			subtitle={t("SUBTITLE")}
			headerRight={
				isEmpty ? undefined : (
					<ChartKpi value={formatCompactNumber(total)} label={t("TOTAL_LABEL")} />
				)
			}
		>
			{isEmpty ? (
				<ChartEmptyState
					icon={<Calendar className="h-5 w-5" />}
					title={t("NO_DATA")}
					description={t("NO_DATA_DESC")}
					height={CHART_HEIGHT}
				/>
			) : (
				<>
					<ResponsiveContainer width="100%" height={CHART_HEIGHT}>
						<BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
							<defs>
								<linearGradient id={`timelineFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={barColor} stopOpacity={isDark ? 0.9 : 1} />
									<stop offset="100%" stopColor={barColor} stopOpacity={isDark ? 0.45 : 0.55} />
								</linearGradient>
							</defs>
							<CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
							<XAxis dataKey="month" {...axisProps} />
							<YAxis {...axisProps} allowDecimals={false} tickFormatter={formatCompactNumber} width={40} />
							<Tooltip
								cursor={{ fill: gridColor }}
								content={
									<ChartTooltip
										valueFormatter={(v) => `${Number(v).toLocaleString()} ${t("SUBMISSIONS_LABEL")}`}
									/>
								}
							/>
							<Bar dataKey="submissions" name={t("SUBMISSIONS_LABEL")} radius={[6, 6, 0, 0]} maxBarSize={56}>
								{data.map((entry, i) => (
									<Cell
										key={`cell-${i}`}
										fill={`url(#timelineFill-${gradientId})`}
										fillOpacity={entry.submissions === peak && peak > 0 ? 1 : 0.75}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
					{peak > 0 && (
						<p className="mt-3 text-[11px] text-neutral-500 dark:text-neutral-400">
							{t("PEAK_HINT", { count: peak, month: peakMonth })}
						</p>
					)}
				</>
			)}
		</ChartCard>
	);
}
