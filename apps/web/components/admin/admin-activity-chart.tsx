import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { TrendingUp } from "lucide-react";
import { AdminChartSkeleton } from "./admin-loading-skeleton";
import { useTranslations } from 'next-intl';


// Design system constants for accessibility
const CHART_TITLE_STYLES = "flex items-center space-x-2";
const LEGEND_CONTAINER_STYLES = "flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6";
const LEGEND_ITEM_STYLES = "flex items-center space-x-2";
const CHART_CONTAINER_STYLES = "h-40 sm:h-48 md:h-56 flex items-end space-x-1";
const BAR_BASE_STYLES = "rounded-t opacity-80 hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500";
const EMPTY_STATE_STYLES = "text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400";

interface AdminActivityChartProps {
  data: AdminStats['activityTrendData'];
  isLoading: boolean;
}

export function AdminActivityChart({ data, isLoading }: AdminActivityChartProps) {
  const t = useTranslations('admin.ACTIVITY_CHART');
  
  if (isLoading) {
    return <AdminChartSkeleton />;
  }

  if (data.length === 0) {
    return (
      <Card role="img" aria-label={t('ARIA_LABELS.CHART_NO_DATA')}>
        <CardHeader>
          <CardTitle className={CHART_TITLE_STYLES}>
            <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span>{t('TITLE')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={EMPTY_STATE_STYLES} role="status">
            {t('NO_DATA_AVAILABLE')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const computedMax = Math.max(...data.map(d => Math.max(d.views, d.votes, d.comments)));
  
  if (computedMax === 0) {
    return (
      <Card role="img" aria-label={t('ARIA_LABELS.CHART_NO_ACTIVITY')}>
        <CardHeader>
          <CardTitle className={CHART_TITLE_STYLES}>
            <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span>{t('TITLE')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={EMPTY_STATE_STYLES} role="status">
            {t('NO_DATA_AVAILABLE')}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const maxValue = computedMax;

  // Calculate data summary for screen readers
  const totalViews = data.reduce((sum, item) => sum + item.views, 0);
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);
  const totalComments = data.reduce((sum, item) => sum + item.comments, 0);
  const chartSummary = t('CHART_SUMMARY', { 
    totalViews, 
    totalVotes, 
    totalComments, 
    daysCount: data.length 
  });

  return (
    <Card 
      role="img" 
      aria-label={chartSummary}
      aria-describedby="activity-chart-details"
    >
      <CardHeader>
        <CardTitle className={CHART_TITLE_STYLES}>
          <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <span>{t('TITLE')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Screen reader summary */}
          <div id="activity-chart-details" className="sr-only">
            {chartSummary}.
          </div>

          {/* Legend */}
          <ul className={LEGEND_CONTAINER_STYLES} aria-label={t('ARIA_LABELS.CHART_LEGEND')}>
            <li className={LEGEND_ITEM_STYLES}>
              <div className="w-3 h-3 bg-blue-500 rounded-full" aria-hidden="true"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('LEGEND.VIEWS')}</span>
            </li>
            <li className={LEGEND_ITEM_STYLES}>
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('LEGEND.VOTES')}</span>
            </li>
            <li className={LEGEND_ITEM_STYLES}>
              <div className="w-3 h-3 bg-purple-500 rounded-full" aria-hidden="true"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('LEGEND.COMMENTS')}</span>
            </li>
          </ul>

          {/* Chart */}
          <ul className={CHART_CONTAINER_STYLES} aria-label={t('ARIA_LABELS.CHART_DATA_BY_DAY')}>
            {data.map((item) => (
              <li 
                key={item.day}
                className="flex-1 flex flex-col items-center space-y-1"
                aria-label={t('DAY_SUMMARY', { 
                  day: item.day, 
                  views: item.views, 
                  votes: item.votes, 
                  comments: item.comments 
                })}
              >
                {/* Bars */}
                <div className="w-full flex items-end space-x-0.5 h-40" aria-hidden="true">
                  <div 
                    className={`bg-blue-500 ${BAR_BASE_STYLES}`}
                    style={{ 
                      height: `${(item.views / maxValue) * 100}%`,
                      minHeight: '2px',
                      width: '30%'
                    }}
                  />
                  <div 
                    className={`bg-green-500 ${BAR_BASE_STYLES}`}
                    style={{ 
                      height: `${(item.votes / maxValue) * 100}%`,
                      minHeight: '2px',
                      width: '30%'
                    }}
                  />
                  <div 
                    className={`bg-purple-500 ${BAR_BASE_STYLES}`}
                    style={{ 
                      height: `${(item.comments / maxValue) * 100}%`,
                      minHeight: '2px',
                      width: '30%'
                    }}
                  />
                </div>
                {/* Day label */}
                <span className="text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
                  {item.day}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 