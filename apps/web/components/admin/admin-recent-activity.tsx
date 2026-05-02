import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { UserPlus, FileText, MessageSquare, ThumbsUp, Activity, ArrowRight } from "lucide-react";
import { AdminActivityListSkeleton } from "./admin-loading-skeleton";
import { cn } from "@/lib/utils";

interface AdminRecentActivityProps {
  data: AdminStats['recentActivity'];
  isLoading: boolean;
}

const ACTIVITY_CONFIG: Record<string, {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  label: string;
}> = {
  user_signup: {
    icon: UserPlus,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    label: "New user",
  },
  submission: {
    icon: FileText,
    iconColor: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    label: "Submission",
  },
  comment: {
    icon: MessageSquare,
    iconColor: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-500/10",
    label: "Comment",
  },
  vote: {
    icon: ThumbsUp,
    iconColor: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
    label: "Vote",
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  iconColor: "text-gray-500 dark:text-gray-400",
  bgColor: "bg-gray-100 dark:bg-white/8",
  label: "Activity",
};

export function AdminRecentActivity({ data, isLoading }: AdminRecentActivityProps) {
  if (isLoading) {
    return <AdminActivityListSkeleton itemCount={5} />;
  }

  return (
    <Card className="flex flex-col border-neutral-100 bg-white dark:border-white/8 dark:bg-white/3">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Activity className="h-4 w-4 text-gray-400" />
            Recent Activity
          </CardTitle>
          {data.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {data.length} events
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-5 pb-5 pt-3">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/6 flex items-center justify-center mb-3">
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No activity yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Events will appear here as they happen</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-100 dark:bg-white/6" aria-hidden="true" />

            <div className="space-y-0">
              {data.map((activity, index) => {
                const config = ACTIVITY_CONFIG[activity.type] || DEFAULT_CONFIG;
                const Icon = config.icon;

                return (
                  <div
                    key={`${activity.timestamp}-${index}`}
                    className="relative flex gap-4 pb-4 last:pb-0 group"
                  >
                    {/* Icon dot on timeline */}
                    <div className={cn(
                      "relative z-10 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ring-2 ring-white dark:ring-gray-900 transition-transform duration-200 group-hover:scale-110",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", config.iconColor)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md",
                              config.bgColor,
                              config.iconColor
                            )}>
                              {config.label}
                            </span>
                            {activity.user && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600 text-xs">·</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">
                                  {activity.user}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5 font-medium tabular-nums">
                          {activity.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/6">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 group">
              View all activity
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
