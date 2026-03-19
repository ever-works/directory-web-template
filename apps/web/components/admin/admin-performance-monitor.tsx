"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

// Constants for className strings
const PERFORMANCE_CONTAINER_STYLES = "space-y-4";
const METRICS_GRID_STYLES = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
const METRIC_CARD_STYLES = "p-4";
const METRIC_HEADER_STYLES = "flex items-center justify-between mb-2";
const METRIC_ICON_STYLES = "h-5 w-5 text-blue-600";
const METRIC_VALUE_STYLES = "text-2xl font-bold text-gray-900 dark:text-white";
const METRIC_LABEL_STYLES = "text-sm text-gray-600 dark:text-gray-400";
const METRIC_SUBTEXT_STYLES = "text-xs text-gray-500 dark:text-gray-400";
const CACHE_STATUS_STYLES = "rounded-lg p-3";
const CACHE_HIT_STYLES = "bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800";
const CACHE_MISS_STYLES = "bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
const CACHE_ERROR_STYLES = "bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800";

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

  // Simulate performance metrics (in real app, this would come from the repository)
  const simulatePerformanceMetrics = async () => {
    setIsLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate realistic mock data
    const newMetrics: PerformanceMetrics = {
      cacheHitRate: Math.random() * 0.4 + 0.6, // 60-100%
      totalQueries: Math.floor(Math.random() * 200) + 50,
      cachedQueries: Math.floor(Math.random() * 150) + 30,
      averageQueryTime: Math.floor(Math.random() * 30) + 20, // 20-50ms
      lastUpdated: new Date().toISOString()
    };

    // Simulate cache status changes
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
    
    // Update metrics every 30 seconds
    const interval = setInterval(simulatePerformanceMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getCacheStatusColor = (status: 'hit' | 'miss' | 'error') => {
    switch (status) {
      case 'hit':
        return 'text-green-600 dark:text-green-400';
      case 'miss':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getCacheStatusText = (status: 'hit' | 'miss' | 'error') => {
    switch (status) {
      case 'hit':
        return t('CACHED');
      case 'miss':
        return t('FRESH');
      case 'error':
        return t('ERROR');
      default:
        return t('UNKNOWN');
    }
  };

  const getCacheStatusStyles = (status: 'hit' | 'miss' | 'error') => {
    switch (status) {
      case 'hit':
        return CACHE_HIT_STYLES;
      case 'miss':
        return CACHE_MISS_STYLES;
      case 'error':
        return CACHE_ERROR_STYLES;
      default:
        return '';
    }
  };

  return (
    <div className={PERFORMANCE_CONTAINER_STYLES}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('SUBTITLE')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={simulatePerformanceMetrics}
          disabled={isLoading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4${isLoading ? ' animate-spin' : ''}`} />
          <span>{t('REFRESH')}</span>
        </Button>
      </div>

      {/* Performance Metrics */}
      <div className={METRICS_GRID_STYLES}>
        <Card className={METRIC_CARD_STYLES}>
          <div className={METRIC_HEADER_STYLES}>
            <div>
              <p className={METRIC_LABEL_STYLES}>{t('CACHE_HIT_RATE')}</p>
              <p className={METRIC_VALUE_STYLES}>
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </p>
            </div>
            <Activity className={METRIC_ICON_STYLES} />
          </div>
          <p className={METRIC_SUBTEXT_STYLES}>
            {t('QUERIES_CACHED', { cachedQueries: metrics.cachedQueries, totalQueries: metrics.totalQueries })}
          </p>
        </Card>

        <Card className={METRIC_CARD_STYLES}>
          <div className={METRIC_HEADER_STYLES}>
            <div>
              <p className={METRIC_LABEL_STYLES}>{t('TOTAL_QUERIES')}</p>
              <p className={METRIC_VALUE_STYLES}>{metrics.totalQueries}</p>
            </div>
            <Zap className={METRIC_ICON_STYLES} />
          </div>
          <p className={METRIC_SUBTEXT_STYLES}>
            {t('QUERIES_EXECUTED')}
          </p>
        </Card>

        <Card className={METRIC_CARD_STYLES}>
          <div className={METRIC_HEADER_STYLES}>
            <div>
              <p className={METRIC_LABEL_STYLES}>{t('AVG_QUERY_TIME')}</p>
              <p className={METRIC_VALUE_STYLES}>{metrics.averageQueryTime}ms</p>
            </div>
            <Clock className={METRIC_ICON_STYLES} />
          </div>
          <p className={METRIC_SUBTEXT_STYLES}>
            {t('AVERAGE_RESPONSE_TIME')}
          </p>
        </Card>

        <Card className={METRIC_CARD_STYLES}>
          <div className={METRIC_HEADER_STYLES}>
            <div>
              <p className={METRIC_LABEL_STYLES}>{t('PERFORMANCE')}</p>
              <p className={METRIC_VALUE_STYLES}>
                {metrics.averageQueryTime < 30 ? t('EXCELLENT') : 
                 metrics.averageQueryTime < 50 ? t('GOOD') : 
                 metrics.averageQueryTime < 100 ? t('FAIR') : t('POOR')}
              </p>
            </div>
            <TrendingUp className={METRIC_ICON_STYLES} />
          </div>
          <p className={METRIC_SUBTEXT_STYLES}>
            {t('BASED_ON_RESPONSE_TIMES')}
          </p>
        </Card>
      </div>

      {/* Cache Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('CACHE_STATUS')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`${CACHE_STATUS_STYLES} ${getCacheStatusStyles(cacheStatus.userGrowth)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('USER_GROWTH')}</span>
                <span className={`text-xs font-medium ${getCacheStatusColor(cacheStatus.userGrowth)}`}>
                  {getCacheStatusText(cacheStatus.userGrowth)}
                </span>
              </div>
            </div>

            <div className={`${CACHE_STATUS_STYLES} ${getCacheStatusStyles(cacheStatus.activityTrends)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('ACTIVITY_TRENDS')}</span>
                <span className={`text-xs font-medium ${getCacheStatusColor(cacheStatus.activityTrends)}`}>
                  {getCacheStatusText(cacheStatus.activityTrends)}
                </span>
              </div>
            </div>

            <div className={`${CACHE_STATUS_STYLES} ${getCacheStatusStyles(cacheStatus.topItems)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('TOP_ITEMS')}</span>
                <span className={`text-xs font-medium ${getCacheStatusColor(cacheStatus.topItems)}`}>
                  {getCacheStatusText(cacheStatus.topItems)}
                </span>
              </div>
            </div>

            <div className={`${CACHE_STATUS_STYLES} ${getCacheStatusStyles(cacheStatus.recentActivity)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('RECENT_ACTIVITY')}</span>
                <span className={`text-xs font-medium ${getCacheStatusColor(cacheStatus.recentActivity)}`}>
                  {getCacheStatusText(cacheStatus.recentActivity)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('LAST_UPDATED', { time: new Date(metrics.lastUpdated).toLocaleTimeString() })}
        </p>
      </div>
    </div>
  );
}
