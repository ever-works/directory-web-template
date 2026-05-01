"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Clock, TrendingUp, RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  cacheHitRate: number;
  totalQueries: number;
  cachedQueries: number;
  averageQueryTime: number;
  lastUpdated: string;
}

interface CacheStatus {
  userGrowth: 'hit' | 'miss' | 'error';
  activityTrends: 'hit' | 'miss' | 'error';
  topItems: 'hit' | 'miss' | 'error';
  recentActivity: 'hit' | 'miss' | 'error';
}

const STATUS_CONFIG = {
  hit:   { icon: CheckCircle, dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  miss:  { icon: AlertCircle, dot: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400'     },
  error: { icon: XCircle,     dot: 'bg-red-500',     text: 'text-red-600 dark:text-red-400'         },
} as const;

const PERF_GRADES = [
  { maxMs: 30,       tKey: 'EXCELLENT', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', pct: 95 },
  { maxMs: 50,       tKey: 'GOOD',      color: 'text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500',    pct: 75 },
  { maxMs: 100,      tKey: 'FAIR',      color: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-500',   pct: 50 },
  { maxMs: Infinity, tKey: 'POOR',      color: 'text-red-600 dark:text-red-400',         bar: 'bg-red-500',     pct: 25 },
] as const;

export function AdminPerformanceMonitor() {
  const t = useTranslations('admin.PERFORMANCE_MONITOR');

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    totalQueries: 0,
    cachedQueries: 0,
    averageQueryTime: 0,
    lastUpdated: new Date().toISOString()
  });

  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    userGrowth: 'miss',
    activityTrends: 'miss',
    topItems: 'miss',
    recentActivity: 'miss'
  });

  const [isLoading, setIsLoading] = useState(false);

  const simulatePerformanceMetrics = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newMetrics: PerformanceMetrics = {
      cacheHitRate: Math.random() * 0.4 + 0.6,
      totalQueries: Math.floor(Math.random() * 200) + 50,
      cachedQueries: Math.floor(Math.random() * 150) + 30,
      averageQueryTime: Math.floor(Math.random() * 30) + 20,
      lastUpdated: new Date().toISOString()
    };

    const newCacheStatus: CacheStatus = {
      userGrowth: Math.random() > 0.7 ? 'hit' : 'miss',
      activityTrends: Math.random() > 0.6 ? 'hit' : 'miss',
      topItems: Math.random() > 0.8 ? 'hit' : 'miss',
      recentActivity: Math.random() > 0.5 ? 'hit' : 'miss'
    };

    setMetrics(newMetrics);
    setCacheStatus(newCacheStatus);
    setIsLoading(false);
  };

  useEffect(() => {
    simulatePerformanceMetrics();
    const interval = setInterval(simulatePerformanceMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const CACHE_STATUS_LABELS: Record<'hit' | 'miss' | 'error', string> = {
    hit:   t('CACHED'),
    miss:  t('FRESH'),
    error: t('ERROR'),
  };

  const gradeBase = PERF_GRADES.find(g => metrics.averageQueryTime < g.maxMs) ?? PERF_GRADES[3];
  const perfGrade = { ...gradeBase, label: t(gradeBase.tKey) };

  const cacheEntries: { key: keyof CacheStatus; label: string }[] = [
    { key: 'userGrowth', label: t('USER_GROWTH') },
    { key: 'activityTrends', label: t('ACTIVITY_TRENDS') },
    { key: 'topItems', label: t('TOP_ITEMS') },
    { key: 'recentActivity', label: t('RECENT_ACTIVITY') },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={simulatePerformanceMetrics}
          disabled={isLoading}
          className="flex cursor-pointer items-center dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-white/3 gap-1.5 shrink-0 text-xs rounded-full px-3 py-1 border border-gray-300 dark:border-white/8"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          {t('REFRESH')}
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Cache Hit Rate */}
        <Card  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-md font-normal tracking-tight text-gray-900 dark:text-white tabular-nums">
              {(metrics.cacheHitRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{t('CACHE_HIT_RATE')}</p>
            {/* Mini progress bar */}
            <div className="mt-3 h-0.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-700"
                style={{ width: `${metrics.cacheHitRate * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 tabular-nums">
              {t('QUERIES_CACHED', { cachedQueries: metrics.cachedQueries, totalQueries: metrics.totalQueries })}
            </p>
          </CardContent>
        </Card>

        {/* Total Queries */}
        <Card  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10">
                <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-md font-normal tracking-tight text-gray-900 dark:text-white tabular-nums">
              {metrics.totalQueries.toLocaleString()}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{t('TOTAL_QUERIES')}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">{t('QUERIES_EXECUTED')}</p>
          </CardContent>
        </Card>

        {/* Avg Query Time */}
        <Card  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-md font-normal tracking-tight text-gray-900 dark:text-white tabular-nums">
              {metrics.averageQueryTime}<span className="text-sm font-semibold text-gray-500 ml-0.5">ms</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('AVG_QUERY_TIME')}</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">{t('AVERAGE_RESPONSE_TIME')}</p>
          </CardContent>
        </Card>

        {/* Performance Grade */}
        <Card  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className={cn("text-md font-normal tracking-tight", perfGrade.color)}>
              {perfGrade.label}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{t('PERFORMANCE')}</p>
            <div className="mt-3 h-0.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", perfGrade.bar)}
                style={{ width: `${perfGrade.pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">{t('BASED_ON_RESPONSE_TIMES')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cache Status */}
      <Card  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">{t('CACHE_STATUS')}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            {cacheEntries.map(({ key, label }) => {
              const status = cacheStatus[key];
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5 px-3.5 bg-gray-50 dark:bg-white/4 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{label}</span>
                  </div>
                  <div className={cn("flex items-center gap-1 ml-2 shrink-0", cfg.text)}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">{CACHE_STATUS_LABELS[status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 font-medium">
        {t('LAST_UPDATED', { time: new Date(metrics.lastUpdated).toLocaleTimeString() })}
      </p>
    </div>
  );
}
