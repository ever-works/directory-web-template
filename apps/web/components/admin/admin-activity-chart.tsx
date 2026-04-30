import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { TrendingUp } from "lucide-react";
import { AdminChartSkeleton } from "./admin-loading-skeleton";
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";

interface AdminActivityChartProps {
  data: AdminStats['activityTrendData'];
  isLoading: boolean;
}

const SERIES = [
  { key: 'views' as const, label: 'LEGEND.VIEWS', color: 'bg-blue-500', barClass: 'bg-blue-500 hover:bg-blue-400' },
  { key: 'votes' as const, label: 'LEGEND.VOTES', color: 'bg-emerald-500', barClass: 'bg-emerald-500 hover:bg-emerald-400' },
  { key: 'comments' as const, label: 'LEGEND.COMMENTS', color: 'bg-violet-500', barClass: 'bg-violet-500 hover:bg-violet-400' },
] as const;

export function AdminActivityChart({ data, isLoading }: AdminActivityChartProps) {
  const t = useTranslations('admin.ACTIVITY_CHART');

  if (isLoading) return <AdminChartSkeleton />;

  const computedMax = data.length > 0
    ? Math.max(...data.map(d => Math.max(d.views, d.votes, d.comments)), 1)
    : 1;

  const totalViews = data.reduce((sum, item) => sum + item.views, 0);
  const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);
  const totalComments = data.reduce((sum, item) => sum + item.comments, 0);

  const isEmpty = data.length === 0 || computedMax === 0;

  const chartSummary = isEmpty
    ? t('ARIA_LABELS.CHART_NO_DATA')
    : t('CHART_SUMMARY', { totalViews, totalVotes, totalComments, daysCount: data.length });

  return (
    <Card role="img" aria-label={chartSummary}  className="border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
      <CardHeader className="px-5 pt-5 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <TrendingUp className="h-4 w-4 text-blue-500" aria-hidden="true" />
            {t('TITLE')}
          </CardTitle>

          <ul
            className="flex items-center gap-4"
            aria-label={t('ARIA_LABELS.CHART_LEGEND')}
          >
            {SERIES.map(s => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-sm shrink-0", s.color)} aria-hidden="true" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t(s.label)}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-52 text-gray-400 dark:text-gray-500">
            <TrendingUp className="h-10 w-10 mb-3 opacity-20" aria-hidden="true" />
            <p className="text-sm font-medium">{t('NO_DATA_AVAILABLE')}</p>
          </div>
        ) : (
          <>
            <p id="activity-chart-details" className="sr-only">{chartSummary}</p>

            <ul
              className="flex items-end gap-1 h-48"
              aria-label={t('ARIA_LABELS.CHART_DATA_BY_DAY')}
              aria-describedby="activity-chart-details"
            >
              {data.map((item) => (
                <li
                  key={item.day}
                  className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
                  aria-label={t('DAY_SUMMARY', {
                    day: item.day,
                    views: item.views,
                    votes: item.votes,
                    comments: item.comments,
                  })}
                >
                  <div className="w-full flex items-end gap-px h-44" aria-hidden="true">
                    {SERIES.map(s => (
                      <div
                        key={s.key}
                        className={cn(
                          "flex-1 rounded-t-sm transition-all duration-200 cursor-default",
                          s.barClass
                        )}
                        style={{
                          height: `${Math.max((item[s.key] / computedMax) * 100, item[s.key] > 0 ? 2 : 0)}%`,
                          opacity: 0.85,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate w-full text-center" aria-hidden="true">
                    {item.day}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/6 grid grid-cols-3 gap-4">
              {[
                { label: t('LEGEND.VIEWS'), value: totalViews, color: 'text-blue-600 dark:text-blue-400' },
                { label: t('LEGEND.VOTES'), value: totalVotes, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: t('LEGEND.COMMENTS'), value: totalComments, color: 'text-violet-600 dark:text-violet-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className={cn("text-lg font-bold tabular-nums tracking-tight", stat.color)}>
                    {stat.value.toLocaleString()}
                  </p>
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
