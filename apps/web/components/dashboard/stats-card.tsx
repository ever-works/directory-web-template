import { useId } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

const CARD_BASE_STYLES =
    'bg-white dark:bg-white/3 rounded-xl p-5 border border-neutral-200 dark:border-white/8';
const ICON_CONTAINER_STYLES = 'p-2 bg-neutral-100 dark:bg-white/8 rounded-lg';
const ICON_STYLES = 'h-4 w-4 text-neutral-500 dark:text-neutral-400';
const TITLE_STYLES = 'text-xs font-medium text-neutral-500 dark:text-neutral-400';
const VALUE_STYLES = 'text-xl font-semibold text-neutral-900 dark:text-white tracking-tight';
const DESCRIPTION_STYLES = 'mt-1.5 text-xs text-neutral-400 dark:text-neutral-500';

interface StatsCardProps {
    title: string;
    value: number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    emptyState?: {
        message: string;
        href?: string;
        linkLabel?: string;
    };
    className?: string;
    isLoading?: boolean;
}

export function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    emptyState,
    className = '',
    isLoading = false
}: StatsCardProps) {
    const uid = useId();
    const base = `${title.toLowerCase().replace(/\s+/g, '-')}-${uid}`;
    const titleId = `${base}-title`;
    const descId = `${base}-description`;

    if (isLoading) {
        return (
            <div className={`${CARD_BASE_STYLES} ${className}`} aria-busy="true" aria-live="polite">
                <span className="sr-only">{`Loading ${title} statistic`}</span>
                <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3.5 bg-neutral-200 dark:bg-white/8 rounded-sm w-24" />
                        <div className="p-2 bg-neutral-200 dark:bg-white/8 rounded-lg">
                            <div className="h-4 w-4 bg-neutral-300 dark:bg-white/10 rounded-sm" />
                        </div>
                    </div>
                    <div className="h-7 bg-neutral-200 dark:bg-white/8 rounded-sm w-16 mb-2" />
                    <div className="h-3 bg-neutral-200 dark:bg-white/8 rounded-sm w-32" />
                </div>
            </div>
        );
    }

    const formattedValue = value.toLocaleString();
    const trendDescription = trend
        ? `${trend.isPositive ? 'increased' : 'decreased'} by ${Math.abs(trend.value)}% from last period`
        : '';

    const showEmpty = value === 0 && emptyState;

    return (
        <article
            className={`${CARD_BASE_STYLES} ${className}`}
            aria-labelledby={titleId}
            {...(description ? { 'aria-describedby': descId } : {})}
        >
            <div className="flex items-start justify-between mb-3">
                <h3 id={titleId} className={TITLE_STYLES}>
                    {title}
                </h3>
                <div className={ICON_CONTAINER_STYLES} aria-hidden="true">
                    <Icon className={ICON_STYLES} />
                </div>
            </div>

            <p className={VALUE_STYLES}>{formattedValue}</p>

            {description && (
                <p id={descId} className={DESCRIPTION_STYLES}>
                    {description}
                </p>
            )}

            {/* Trend badge */}
            {trend && value > 0 && (
                <div className="mt-2 flex items-center gap-1">
                    <span className="sr-only">{trendDescription}</span>
                    {trend.value === 0 ? (
                        <span className="text-xs text-neutral-400 dark:text-neutral-500" aria-hidden="true">
                            No change
                        </span>
                    ) : (
                        <>
                            {trend.isPositive ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                            ) : (
                                <TrendingDown className="h-3 w-3 text-red-500 dark:text-red-400" aria-hidden="true" />
                            )}
                            <span
                                className={`text-xs font-medium ${
                                    trend.isPositive
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-500 dark:text-red-400'
                                }`}
                                aria-hidden="true"
                            >
                                {trend.isPositive ? '+' : '-'}
                                {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-neutral-400 dark:text-neutral-500" aria-hidden="true">
                                vs last period
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Zero-state CTA */}
            {showEmpty && (
                <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-white/6">
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
                        {emptyState.message}
                    </p>
                    {emptyState.href && (
                        <Link
                            href={emptyState.href}
                            className="text-[11px] font-semibold text-neutral-900 dark:text-white underline underline-offset-2 hover:opacity-70 transition-opacity"
                        >
                            {emptyState.linkLabel ?? 'Get started →'}
                        </Link>
                    )}
                </div>
            )}
        </article>
    );
}
