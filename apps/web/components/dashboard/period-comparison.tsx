"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PeriodComparisonDataExport } from "@/hooks/use-dashboard-stats";
import {
    CARD_BASE_STYLES,
    TITLE_STYLES,
    SUBTITLE_STYLES,
    METRIC_CARD_STYLES,
    METRIC_LABEL_STYLES,
    METRIC_VALUE_STYLES,
    METRIC_COMPARE_STYLES,
    SEMANTIC_COLORS,
} from "./styles";

interface PeriodComparisonProps {
    data?: PeriodComparisonDataExport;
    isLoading?: boolean;
}

interface MetricCardProps {
    label: string;
    thisWeek: number;
    lastWeek: number;
    change: number;
    color: string;
    vsLabel: string;
    ariaLabel: string;
}

function ChangeIndicator({ value }: { value: number }) {
    const isPositive = value > 0;
    const isNegative = value < 0;

    const colorClass = isPositive
        ? "text-green-600 dark:text-green-400"
        : isNegative
          ? "text-red-600 dark:text-red-400"
          : "text-gray-500 dark:text-gray-400";

    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    return (
        <div className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${colorClass}`} />
            <span className={`text-xs font-medium ${colorClass}`}>
                {isPositive ? "+" : ""}
                {value}%
            </span>
        </div>
    );
}

function MetricCard({ label, thisWeek, lastWeek, change, color, vsLabel, ariaLabel }: MetricCardProps) {
    return (
        <div className={METRIC_CARD_STYLES} role="group" aria-label={ariaLabel}>
            <div className="flex items-center justify-between">
                <span className={METRIC_LABEL_STYLES}>{label}</span>
                <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                />
            </div>
            <div className="flex items-baseline gap-2">
                <span className={METRIC_VALUE_STYLES}>
                    {thisWeek.toLocaleString()}
                </span>
                <span className={METRIC_COMPARE_STYLES}>
                    {vsLabel} {lastWeek.toLocaleString()}
                </span>
            </div>
            <ChangeIndicator value={change} />
        </div>
    );
}

export function PeriodComparison({ data, isLoading = false }: PeriodComparisonProps) {
    const t = useTranslations("client.dashboard.PERIOD_COMPARISON");
    const tCommon = useTranslations("client.dashboard.COMMON");

    if (isLoading) {
        return (
            <div className={CARD_BASE_STYLES}>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-4 w-1/3"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className={CARD_BASE_STYLES}>
                <h3 className={TITLE_STYLES}>{t("TITLE")}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    {t("NO_DATA")}
                </p>
                <p className={`${SUBTITLE_STYLES} text-center`}>
                    {t("NO_DATA_DESC")}
                </p>
            </div>
        );
    }

    const vsLabel = tCommon("VS");

    return (
        <section className={CARD_BASE_STYLES} aria-labelledby="period-comparison-title">
            <div className="flex items-center justify-between mb-4">
                <h3 id="period-comparison-title" className={TITLE_STYLES}>{t("TITLE")}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {t("THIS_WEEK")} {vsLabel} {t("LAST_WEEK")}
                </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label={t("VOTES")}
                    thisWeek={data.thisWeek.votes}
                    lastWeek={data.lastWeek.votes}
                    change={data.change.votes}
                    color={SEMANTIC_COLORS.votes}
                    vsLabel={vsLabel}
                    ariaLabel={`${t("VOTES")}: ${data.thisWeek.votes} ${vsLabel} ${data.lastWeek.votes}`}
                />
                <MetricCard
                    label={t("COMMENTS")}
                    thisWeek={data.thisWeek.comments}
                    lastWeek={data.lastWeek.comments}
                    change={data.change.comments}
                    color={SEMANTIC_COLORS.comments}
                    vsLabel={vsLabel}
                    ariaLabel={`${t("COMMENTS")}: ${data.thisWeek.comments} ${vsLabel} ${data.lastWeek.comments}`}
                />
                <MetricCard
                    label={t("SUBMISSIONS")}
                    thisWeek={data.thisWeek.submissions}
                    lastWeek={data.lastWeek.submissions}
                    change={data.change.submissions}
                    color={SEMANTIC_COLORS.submissions}
                    vsLabel={vsLabel}
                    ariaLabel={`${t("SUBMISSIONS")}: ${data.thisWeek.submissions} ${vsLabel} ${data.lastWeek.submissions}`}
                />
                <MetricCard
                    label={t("VIEWS")}
                    thisWeek={data.thisWeek.views}
                    lastWeek={data.lastWeek.views}
                    change={data.change.views}
                    color={SEMANTIC_COLORS.views}
                    vsLabel={vsLabel}
                    ariaLabel={`${t("VIEWS")}: ${data.thisWeek.views} ${vsLabel} ${data.lastWeek.views}`}
                />
            </div>
        </section>
    );
}
