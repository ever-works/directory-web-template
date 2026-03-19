"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, UserPlus } from "lucide-react";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useTranslations } from "next-intl";

// Removed unused notificationTypeIcons and notificationTypeLabels
// These were defined but never used in the component

export function AdminNotificationStats() {
  const { stats, isLoading } = useAdminNotifications();
  const t = useTranslations('admin.NOTIFICATION_STATS');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded-sm w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded-sm w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('TOTAL')}</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            {t('ALL_NOTIFICATIONS')}
          </p>
        </CardContent>
      </Card>

      {/* Unread Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('UNREAD')}</CardTitle>
          <Badge variant="destructive" className="h-4 w-4 rounded-full p-0 flex items-center justify-center">
            {stats.unread}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.unread}</div>
          <p className="text-xs text-muted-foreground">
            {t('REQUIRE_ATTENTION')}
          </p>
        </CardContent>
      </Card>

      {/* Item Submissions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('SUBMISSIONS')}</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byType.item_submission || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('PENDING_REVIEW')}
          </p>
        </CardContent>
      </Card>

      {/* Comments Reported */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('REPORTED')}</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byType.comment_reported || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('COMMENTS_FLAGGED')}
          </p>
        </CardContent>
      </Card>

      {/* New Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('NEW_USERS')}</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byType.user_registered || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('RECENTLY_REGISTERED')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
