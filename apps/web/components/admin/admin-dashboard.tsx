'use client';

import { useEffect, useState } from 'react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { RefreshCw, AlertCircle, BarChart3, Activity, Gauge, FileDown, Wrench } from 'lucide-react';
import { AdminErrorBoundary } from './admin-error-boundary';
import { AdminStatsOverview } from './admin-stats-overview';
import { AdminActivityChart } from './admin-activity-chart';
import { AdminSubmissionStatus } from './admin-submission-status';
import { AdminRecentActivity } from './admin-recent-activity';
import { AdminTopItems } from './admin-top-items';
import { AdminFeaturesGrid } from './admin-features-grid';
import { AdminPerformanceMonitor } from './admin-performance-monitor';
import { AdminDataExport } from './admin-data-export';
import { GeographicSection } from './dashboard/GeographicSection';
import {
    AdminSkipLink,
    AdminLandmark,
    AdminStatusAnnouncer,
    AdminAccessibleButton,
} from './admin-accessibility';
import { AdminResponsiveGrid } from './admin-responsive';
import { AdminPullToRefresh } from './admin-touch-interactions';
import { AdminWelcomeGradient } from './admin-welcome-section';
import { AdminNotifications } from './admin-notifications';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

type TabKey = 'overview' | 'analytics' | 'performance' | 'reports' | 'tools';

// ─── Shared primitives ────────────────────────────────────────────────────────

/** A full-width card with optional title + description header */
function Section({
    icon: Icon,
    title,
    description,
    children,
    className = '',
}: {
    icon?: React.ComponentType<{ className?: string }>;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={[
                'rounded-xl border border-neutral-100 bg-white dark:border-white/8 dark:bg-transparent',
                className,
            ].join(' ')}
        >
            {(title || description) && (
                <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4 dark:border-white/6">
                    {Icon && (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-white/8">
                            <Icon className="h-4 w-4 text-neutral-500 dark:text-white/40" />
                        </div>
                    )}
                    <div>
                        {title && (
                            <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
                        )}
                        {description && (
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-white/40">{description}</p>
                        )}
                    </div>
                </div>
            )}
            <div className="p-5">{children}</div>
        </div>
    );
}

/** Slim label above a group of sections */
function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-white/25">
            {children}
        </p>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
    const t = useTranslations('admin.DASHBOARD');
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const { data: stats, isLoading, isError, error, refetch, isFetching } = useAdminStats();

    const [srMessage, setSrMessage] = useState('');
    useEffect(() => {
        if (isFetching) setSrMessage(t('REFRESHING_DASHBOARD_DATA'));
        else if (isError) setSrMessage(t('ERROR_LOADING_DASHBOARD_DATA'));
        else if (stats) setSrMessage(t('DASHBOARD_DATA_LOADED_SUCCESSFULLY'));
    }, [isFetching, isError, stats, t]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-theme-primary/20 border-t-theme-primary" />
                    <p className="text-sm text-neutral-500 dark:text-white/40">{t('LOADING_DASHBOARD_DATA')}</p>
                </div>
            </div>
        );
    }

    const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
        { key: 'overview',     label: t('TABS.OVERVIEW'),     icon: BarChart3  },
        { key: 'analytics',    label: t('TABS.ANALYTICS'),    icon: Activity   },
        { key: 'performance',  label: t('TABS.PERFORMANCE'),  icon: Gauge      },
        { key: 'reports',      label: t('TABS.REPORTS'),      icon: FileDown   },
        { key: 'tools',        label: t('TABS.TOOLS'),        icon: Wrench     },
    ];

    return (
        <>
            <AdminSkipLink href="#main-content">{t('SKIP_TO_MAIN_CONTENT')}</AdminSkipLink>
            <AdminSkipLink href="#dashboard-stats">{t('SKIP_TO_STATISTICS')}</AdminSkipLink>

            <AdminStatusAnnouncer message={srMessage} priority={isError ? 'assertive' : 'polite'} />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">

                {/* ── Page header ─────────────────────────────────────────── */}
                <AdminWelcomeGradient
                    title={t('TITLE')}
                    subtitle={t('SUBTITLE')}
                    rightActions={
                        <div className="flex items-center gap-2">
                            <AdminNotifications />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="flex cursor-pointer items-center dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/3 gap-1.5 shrink-0 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8"
                            >
                                <RefreshCw className={['h-3.5 w-3.5', isFetching ? 'animate-spin' : ''].join(' ')} />
                                {t('REFRESH')}
                            </Button>
                        </div>
                    }
                />

                {/* ── Tab bar ──────────────────────────────────────────────── */}
                <div
                    role="tablist"
                    aria-label={t('ARIA_LABELS.DASHBOARD_SECTIONS')}
                    className="flex gap-0 border-b border-neutral-200 dark:border-white/6"
                >
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const active = activeTab === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                aria-controls={`section-${key}`}
                                onClick={() => setActiveTab(key)}
                                className={[
                                    'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium',
                                    'border-b-2 -mb-px transition-colors cursor-pointer',
                                    active
                                        ? 'border-theme-primary text-theme-primary'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-white/40 dark:hover:text-white/70',
                                ].join(' ')}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Error banner ─────────────────────────────────────────── */}
                {isError && (
                    <AdminLandmark
                        as="section"
                        label={t('ARIA_LABELS.ERROR_NOTIFICATION')}
                        role="alert"
                        aria-live="assertive"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/40 dark:bg-red-900/10"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <p className="flex-1 text-sm text-red-700 dark:text-red-400">
                            {error instanceof Error ? error.message : t('FAILED_TO_LOAD_ADMIN_STATISTICS')}
                        </p>
                        <AdminAccessibleButton
                            variant="secondary"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            aria-label={t('RETRY_LOADING_DASHBOARD_DATA')}
                        >
                            {t('RETRY')}
                        </AdminAccessibleButton>
                    </AdminLandmark>
                )}

                {/* ── Tab panels ───────────────────────────────────────────── */}
                {!isError && (
                    <AdminPullToRefresh onRefresh={async () => { await refetch(); }}>

                        {/* ════════════════ OVERVIEW ════════════════ */}
                        {activeTab === 'overview' && (
                            <section id="section-overview" aria-label={t('ARIA_LABELS.OVERVIEW')} className="space-y-6">

                                {/* Stats row */}
                                <div id="dashboard-stats" className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.DASHBOARD_STATISTICS')}</GroupLabel>
                                    <AdminErrorBoundary>
                                        <AdminStatsOverview stats={stats} isLoading={false} />
                                    </AdminErrorBoundary>
                                </div>

                                {/* Submission Status */}
                                <div className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.SUBMISSIONS_STATUS')}</GroupLabel>
                                    <AdminErrorBoundary>
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                                            {/* Pie chart card takes 2 cols */}
                                            <div className="lg:col-span-2">
                                                <AdminSubmissionStatus
                                                    data={stats?.submissionStatusData || []}
                                                    isLoading={false}
                                                />
                                            </div>

                                            {/* Summary metrics on the right */}
                                            <div className="lg:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-3 content-start">
                                                {[
                                                    {
                                                        label: 'Total Submissions',
                                                        value: stats?.totalSubmissions ?? 0,
                                                        color: 'text-theme-primary',
                                                        bg: 'bg-theme-primary/8 dark:bg-theme-primary/10',
                                                    },
                                                    {
                                                        label: 'Pending Review',
                                                        value: stats?.pendingSubmissions ?? 0,
                                                        color: 'text-amber-600 dark:text-amber-400',
                                                        bg: 'bg-amber-50 dark:bg-amber-900/20',
                                                    },
                                                    {
                                                        label: 'Approved',
                                                        value:
                                                            (stats?.totalSubmissions ?? 0) -
                                                            (stats?.pendingSubmissions ?? 0),
                                                        color: 'text-emerald-600 dark:text-emerald-400',
                                                        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
                                                    },
                                                ].map(({ label, value, color, bg }) => (
                                                    <div
                                                        key={label}
                                                        className={[
                                                            'flex flex-col gap-1 rounded-xl p-4',
                                                            'border border-neutral-100 dark:border-white/8',
                                                        ].join(' ')}
                                                    >
                                                        <span className="text-xs font-medium text-neutral-500 dark:text-white/40">
                                                            {label}
                                                        </span>
                                                        <span className={`text-2xl font-normal ${color}`}>
                                                            {value.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}

                                                {/* Hint card */}
                                                <div className="sm:col-span-3 rounded-xl border border-neutral-100 bg-white p-4 dark:border-white/8 dark:bg-white/3">
                                                    <p className="text-xs font-semibold text-neutral-500 dark:text-white/40 mb-2 uppercase tracking-wider">
                                                        Quick tip
                                                    </p>
                                                    <p className="text-xs text-neutral-600 dark:text-white/60 leading-relaxed">
                                                        Review pending submissions under{' '}
                                                        <a href="/admin/items" className="font-medium text-theme-primary hover:underline">
                                                            Manage Items
                                                        </a>{' '}
                                                        to keep your directory up to date.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </AdminErrorBoundary>
                                </div>
                            </section>
                        )}

                        {/* ════════════════ ANALYTICS ════════════════ */}
                        {activeTab === 'analytics' && (
                            <section id="section-analytics" aria-label={t('ARIA_LABELS.ANALYTICS')} className="space-y-6">

                                <div id="dashboard-charts" className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.ANALYTICS_OVERVIEW')}</GroupLabel>
                                    <AdminResponsiveGrid cols={2} gap="lg">
                                        <AdminErrorBoundary>
                                            <AdminActivityChart data={stats?.activityTrendData || []} isLoading={false} />
                                        </AdminErrorBoundary>
                                        <AdminErrorBoundary>
                                            <AdminTopItems data={stats?.topItemsData || []} isLoading={false} />
                                        </AdminErrorBoundary>
                                    </AdminResponsiveGrid>
                                </div>

                                <div className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.RECENT_ACTIVITY')}</GroupLabel>
                                    <AdminErrorBoundary>
                                        <AdminRecentActivity data={stats?.recentActivity || []} isLoading={false} />
                                    </AdminErrorBoundary>
                                </div>

                                <div className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.GEOGRAPHIC_DISTRIBUTION')}</GroupLabel>
                                    <Section
                                        icon={Activity}
                                        title="Geographic Distribution"
                                        description="Where your users and items are located across the world."
                                    >
                                        <AdminErrorBoundary>
                                            <GeographicSection />
                                        </AdminErrorBoundary>
                                    </Section>
                                </div>
                            </section>
                        )}

                        {/* ════════════════ PERFORMANCE ════════════════ */}
                        {activeTab === 'performance' && (
                            <section id="section-performance" aria-label={t('ARIA_LABELS.PERFORMANCE')} className="space-y-6">
                                <div className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.PERFORMANCE')}</GroupLabel>
                                    <Section
                                        icon={Gauge}
                                        title="System Performance"
                                        description="Real-time cache hit rates, query counts and response time averages."
                                    >
                                        <AdminErrorBoundary>
                                            <AdminPerformanceMonitor />
                                        </AdminErrorBoundary>
                                    </Section>
                                </div>
                            </section>
                        )}

                        {/* ════════════════ REPORTS ════════════════ */}
                        {activeTab === 'reports' && (
                            <section id="section-reports" aria-label={t('ARIA_LABELS.REPORTS')} className="space-y-6">
                                <div className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.DATA_EXPORT_REPORTS')}</GroupLabel>
                                    <Section
                                        icon={FileDown}
                                        title="Data Export & Scheduled Reports"
                                        description="Export platform data as CSV or JSON, and manage automated report schedules."
                                    >
                                        <AdminErrorBoundary>
                                            <AdminDataExport />
                                        </AdminErrorBoundary>
                                    </Section>
                                </div>
                            </section>
                        )}

                        {/* ════════════════ TOOLS ════════════════ */}
                        {activeTab === 'tools' && (
                            <section id="section-tools" aria-label={t('ARIA_LABELS.TOOLS')} className="space-y-6">
                                <div id="admin-tools" className="space-y-2">
                                    <GroupLabel>{t('SECTIONS.ADMIN_TOOLS')}</GroupLabel>

                                    {/* Intro banner */}
                                    <div className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-neutral-50 px-5 py-4 dark:border-white/8 dark:bg-white/3">
                                        <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-theme-primary" />
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-800 dark:text-white">
                                                Admin Tools
                                            </p>
                                            <p className="mt-0.5 text-sm text-neutral-500 dark:text-white/40">
                                                Quick links to every section of your admin panel. Use these to manage
                                                content, users, moderation and platform settings.
                                            </p>
                                        </div>
                                    </div>

                                    <AdminFeaturesGrid />
                                </div>
                            </section>
                        )}

                    </AdminPullToRefresh>
                )}
            </div>
        </>
    );
}
