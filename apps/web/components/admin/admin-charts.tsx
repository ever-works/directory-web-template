"use client";

import { TrendingUp, Users, Activity, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface UserGrowthData {
  month: string;
  users: number;
  active: number;
}

export interface ActivityTrendData {
  day: string;
  views: number;
  votes: number;
  comments: number;
}

export interface TopItemData {
  name: string;
  views: number;
  votes: number;
  category?: string;
}

export interface RecentActivityData {
  type: 'user_signup' | 'submission' | 'comment' | 'vote';
  description: string;
  timestamp: string;
  user?: string;
}

interface AdminChartsProps {
  userGrowthData: UserGrowthData[];
  activityTrendData: ActivityTrendData[];
  topItemsData: TopItemData[];
  recentActivityData: RecentActivityData[];
}

const SUMMARY_STATS = [
  {
    labelKey: 'STATS.TOTAL_USERS' as const,
    icon: Users,
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    getValue: (d: AdminChartsProps) =>
      d.userGrowthData.length > 0 ? d.userGrowthData[d.userGrowthData.length - 1]?.active ?? 0 : 0,
  },
  {
    labelKey: 'STATS.NEW_THIS_MONTH' as const,
    icon: TrendingUp,
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    getValue: (d: AdminChartsProps) =>
      d.userGrowthData.length > 0 ? d.userGrowthData[d.userGrowthData.length - 1]?.users ?? 0 : 0,
  },
  {
    labelKey: 'STATS.TOTAL_VOTES' as const,
    icon: Activity,
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    getValue: (d: AdminChartsProps) => d.activityTrendData.reduce((s, day) => s + day.votes, 0),
  },
  {
    labelKey: 'STATS.TOP_ITEMS' as const,
    icon: BarChart3,
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    getValue: (d: AdminChartsProps) => d.topItemsData.length,
  },
] as const;

function EmptyPlaceholder({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-3">
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[180px]">{sublabel}</p>
    </div>
  );
}

export function AdminCharts({ userGrowthData, activityTrendData, topItemsData, recentActivityData }: AdminChartsProps) {
  const t = useTranslations('admin.CHARTS');
  const props = { userGrowthData, activityTrendData, topItemsData, recentActivityData };

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = stat.getValue(props);
          return (
            <div key={stat.labelKey}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2 rounded-xl", stat.iconBg)}>
                    <Icon className={cn("h-4 w-4", stat.iconColor)} />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums leading-none">
                  {value.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1.5">
                  {t(stat.labelKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <div className="flex flex-col" style={{ minHeight: '20rem' }}>
          <div className="px-5 pt-5 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              {t('CHARTS.USER_GROWTH_TRENDS')}
            </h2>
          </div>
          <div className="flex-1 px-5 pb-5">
            {userGrowthData.length > 0 ? (
              <div className="space-y-2">
                {userGrowthData.slice(-6).map((d, i) => {
                  const maxUsers = Math.max(...userGrowthData.map(x => x.users), 1);
                  const pct = (d.users / maxUsers) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3 group">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 shrink-0">{d.month}</span>
                      <div className="flex-1 h-0.5 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums w-12 text-right">
                        +{d.users.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                  {t('DATA_INFO.MONTHS_OF_DATA_AVAILABLE', { count: userGrowthData.length })}
                </p>
              </div>
            ) : (
              <EmptyPlaceholder
                label={t('NO_DATA.NO_USER_GROWTH_DATA')}
                sublabel={t('NO_DATA_DESCRIPTIONS.START_COLLECTING_USER_DATA')}
              />
            )}
          </div>
        </div>

        {/* Activity Trends */}
        <div className="flex flex-col" style={{ minHeight: '20rem' }}>
          <div className="px-5 pt-5 pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Activity className="h-4 w-4 text-violet-500" />
              {t('CHARTS.ACTIVITY_TRENDS')}
            </h2>
          </div>
          <div className="flex-1 px-5 pb-5">
            {activityTrendData.length > 0 ? (
              <div className="space-y-2">
                {activityTrendData.slice(-7).map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 shrink-0">{d.day}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-0.5 rounded-full bg-blue-100 dark:bg-blue-500/15 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((d.votes / 100) * 100, 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums w-12 text-right">
                        {d.votes.toLocaleString()} {t('DATA_INFO.VOTES')}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums w-16 text-right">
                        {d.comments.toLocaleString()} {t('DATA_INFO.COMMENTS')}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                  {t('DATA_INFO.DAYS_OF_DATA_AVAILABLE', { count: activityTrendData.length })}
                </p>
              </div>
            ) : (
              <EmptyPlaceholder
                label={t('NO_DATA.NO_ACTIVITY_DATA')}
                sublabel={t('NO_DATA_DESCRIPTIONS.START_COLLECTING_ACTIVITY_DATA')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Top Items */}
      <div>
        <div className="px-5 pt-5 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            {t('CHARTS.TOP_PERFORMING_ITEMS')}
          </h2>
        </div>
        <div className="px-5 pb-5">
          {topItemsData.length > 0 ? (
            <div className="space-y-1">
              {topItemsData.slice(0, 10).map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/4 transition-colors duration-150 group"
                >
                  <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/8 flex items-center justify-center text-[11px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {item.name}
                    </p>
                    {item.category && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.category}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{item.votes.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('DATA_INFO.VOTES')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{item.views.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('DATA_INFO.VIEWS')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPlaceholder
              label={t('NO_DATA.NO_TOP_ITEMS_DATA')}
              sublabel={t('NO_DATA_DESCRIPTIONS.START_COLLECTING_ITEM_DATA')}
            />
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="px-5 pt-5 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Activity className="h-4 w-4 text-gray-400" />
            {t('CHARTS.RECENT_ACTIVITY')}
          </h2>
        </div>
        <div className="px-5 pb-5">
          {recentActivityData.length > 0 ? (
            <div className="space-y-1">
              {recentActivityData.slice(0, 10).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/4 transition-colors duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  {activity.user && (
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                      {activity.user}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPlaceholder
              label={t('NO_DATA.NO_RECENT_ACTIVITY')}
              sublabel={t('NO_DATA_DESCRIPTIONS.START_COLLECTING_ACTIVITY_UPDATES')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
