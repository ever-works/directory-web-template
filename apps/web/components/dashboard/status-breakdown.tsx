"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, XCircle, Activity } from "lucide-react";
import { ChartCard, ChartCardSkeleton, ChartEmptyState, ChartKpi } from "./_chart-primitives";

type StatusKey = "Approved" | "Pending" | "Rejected";

interface StatusBreakdownData {
	status: StatusKey;
	value: number;
	color: string;
	[key: string]: string | number;
}

interface StatusBreakdownProps {
	data: StatusBreakdownData[];
	isLoading?: boolean;
}

const CHART_HEIGHT = 240;

const STATUS_META: Record<StatusKey, { labelKey: "APPROVED_LABEL" | "PENDING_LABEL" | "REJECTED_LABEL"; Icon: typeof CheckCircle2 }> = {
	Approved: { labelKey: "APPROVED_LABEL", Icon: CheckCircle2 },
	Pending: { labelKey: "PENDING_LABEL", Icon: Clock },
	Rejected: { labelKey: "REJECTED_LABEL", Icon: XCircle },
};

export function StatusBreakdown({ data, isLoading = false }: StatusBreakdownProps) {
	const t = useTranslations("client.dashboard.STATUS_BREAKDOWN");

	const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

	if (isLoading) {
		return <ChartCardSkeleton height={CHART_HEIGHT} hasHeaderRight />;
	}

	const isEmpty = total === 0;

	return (
		<ChartCard
			title={t("TITLE")}
			subtitle={t("SUBTITLE")}
			headerRight={
				isEmpty ? undefined : <ChartKpi value={total.toLocaleString()} label={t("TOTAL_LABEL")} />
			}
		>
			{isEmpty ? (
				<ChartEmptyState
					icon={<Activity className="h-5 w-5" />}
					title={t("NO_DATA")}
					description={t("NO_DATA_DESC")}
					height={CHART_HEIGHT}
				/>
			) : (
				<div className="flex flex-col gap-5" style={{ minHeight: CHART_HEIGHT }}>
					{/* Horizontal stacked bar */}
					<div
						className="relative flex h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/[0.05]"
						role="img"
						aria-label={`${t("TITLE")}: ${data
							.map((d) => `${t(STATUS_META[d.status].labelKey)} ${Math.round((d.value / total) * 100)}%`)
							.join(", ")}`}
					>
						{data.map((d) => {
							const pct = (d.value / total) * 100;
							if (pct === 0) return null;
							return (
								<div
									key={d.status}
									className="h-full transition-[width] duration-300 ease-out"
									style={{ width: `${pct}%`, backgroundColor: d.color }}
									title={`${t(STATUS_META[d.status].labelKey)} — ${d.value} (${pct.toFixed(0)}%)`}
								/>
							);
						})}
					</div>

					{/* Per-status rows */}
					<ul className="space-y-2.5">
						{data.map((d) => {
							const meta = STATUS_META[d.status];
							const pct = total > 0 ? (d.value / total) * 100 : 0;
							const Icon = meta.Icon;
							return (
								<li
									key={d.status}
									className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<span
											className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
											style={{ backgroundColor: `${d.color}1F`, color: d.color }}
											aria-hidden="true"
										>
											<Icon className="h-3.5 w-3.5" />
										</span>
										<span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
											{t(meta.labelKey)}
										</span>
									</div>
									<div className="flex items-baseline gap-2 shrink-0 tabular-nums">
										<span className="text-sm font-semibold text-neutral-900 dark:text-white">
											{d.value.toLocaleString()}
										</span>
										<span className="text-[11px] text-neutral-500 dark:text-neutral-400 w-10 text-right">
											{pct.toFixed(0)}%
										</span>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</ChartCard>
	);
}
