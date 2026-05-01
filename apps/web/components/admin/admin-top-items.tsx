import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { Trophy, Eye, ThumbsUp, ArrowRight } from "lucide-react";
import { AdminTableSkeleton } from "./admin-loading-skeleton";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AdminTopItemsProps {
  data: AdminStats['topItemsData'];
  isLoading: boolean;
}

const RANK_STYLES: Record<number, { badge: string; bar: string }> = {
  0: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/20",
    bar: "bg-amber-400 dark:bg-amber-500",
  },
  1: {
    badge: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-white/10",
    bar: "bg-gray-400 dark:bg-gray-500",
  },
  2: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 ring-1 ring-orange-200 dark:ring-orange-500/20",
    bar: "bg-orange-400 dark:bg-orange-500",
  },
};

const DEFAULT_RANK = {
  badge: "bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500",
  bar: "bg-blue-400 dark:bg-blue-500",
};

export function AdminTopItems({ data, isLoading }: AdminTopItemsProps) {
  const t = useTranslations('admin.TOP_ITEMS');

  if (isLoading) {
    return <AdminTableSkeleton rows={5} columns={3} />;
  }

  const maxViews = data.length > 0 ? Math.max(...data.map(item => item.views)) : 1;

  return (
    <Card className="flex flex-col border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t('TITLE')}
          </CardTitle>
          {data.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {data.length} items
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-5 pb-5 pt-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-3">
              <Trophy className="h-5 w-5 text-amber-500 opacity-60" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('NO_ITEMS_FOUND')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Top performing items will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.map((item, index) => {
              const rank = RANK_STYLES[index] ?? DEFAULT_RANK;
              const pct = maxViews > 0 ? (item.views / maxViews) * 100 : 0;

              return (
                <div
                  key={index}
                  className="group rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/4 transition-colors duration-150 cursor-default"
                >
                  <div className="flex items-center gap-3">
                    {/* Rank badge */}
                    <span className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold",
                      rank.badge
                    )}>
                      {index + 1}
                    </span>

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate min-w-0 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {item.name}
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Eye className="h-3 w-3" />
                        <span className="tabular-nums font-medium">{item.views.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <ThumbsUp className="h-3 w-3" />
                        <span className="tabular-nums font-medium">{item.votes.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 ml-9 h-1 rounded-full bg-gray-100 dark:bg-white/8 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", rank.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/6">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 group">
              {t('VIEW_ALL_ITEMS')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
