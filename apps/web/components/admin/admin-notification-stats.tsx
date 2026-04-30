"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Bell, MessageSquare, UserPlus, FileText, AlertCircle } from "lucide-react";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const statConfigs = [
  {
    key: "total",
    icon: Bell,
    iconBg: "bg-gray-100 dark:bg-white/8",
    iconColor: "text-gray-600 dark:text-gray-400",
    valueColor: "text-gray-900 dark:text-white",
    highlight: false,
  },
  {
    key: "unread",
    icon: AlertCircle,
    iconBg: "bg-red-50 dark:bg-red-500/10",
    iconColor: "text-red-500 dark:text-red-400",
    valueColor: "text-red-600 dark:text-red-400",
    highlight: true,
  },
  {
    key: "submissions",
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-500 dark:text-blue-400",
    valueColor: "text-gray-900 dark:text-white",
    highlight: false,
  },
  {
    key: "reported",
    icon: MessageSquare,
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-500 dark:text-amber-400",
    valueColor: "text-gray-900 dark:text-white",
    highlight: false,
  },
  {
    key: "newUsers",
    icon: UserPlus,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-500 dark:text-emerald-400",
    valueColor: "text-gray-900 dark:text-white",
    highlight: false,
  },
] as const;

export function AdminNotificationStats() {
  const { stats, isLoading } = useAdminNotifications();
  const t = useTranslations('admin.NOTIFICATION_STATS');

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-white/8" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-14 bg-gray-200 dark:bg-white/8 rounded-md" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-white/5 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const displayStats = [
    { ...statConfigs[0], value: stats.total,                          title: t('TOTAL'),       label: t('ALL_NOTIFICATIONS')   },
    { ...statConfigs[1], value: stats.unread,                         title: t('UNREAD'),      label: t('REQUIRE_ATTENTION')   },
    { ...statConfigs[2], value: stats.byType.item_submission  || 0,   title: t('SUBMISSIONS'), label: t('PENDING_REVIEW')      },
    { ...statConfigs[3], value: stats.byType.comment_reported || 0,   title: t('REPORTED'),    label: t('COMMENTS_FLAGGED')    },
    { ...statConfigs[4], value: stats.byType.user_registered  || 0,   title: t('NEW_USERS'),   label: t('RECENTLY_REGISTERED') },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {displayStats.map((config) => {
        const Icon = config.icon;
        return (
          <Card
            key={config.key}
            className={cn(
              "relative overflow-hidden transition-shadow duration-200 hover:shadow-md",
              config.highlight && config.value > 0
                ? "ring-1 ring-red-200 dark:ring-red-500/20"
                : ""
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-2 rounded-xl", config.iconBg)}>
                  <Icon className={cn("h-4 w-4", config.iconColor)} />
                </div>
                {config.highlight && config.value > 0 && (
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <div>
                <p className={cn("text-2xl font-bold tracking-tight tabular-nums leading-none mb-1", config.valueColor)}>
                  {config.value.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-snug">
                  {config.title}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                  {config.label}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
