"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, ExternalLink, RefreshCw, AlertCircle, UserPlus, CreditCard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useTranslations } from "next-intl";

interface AdminNotificationsProps {
  className?: string;
}

export function AdminNotifications({ className }: AdminNotificationsProps) {
  const router = useRouter();
  const t = useTranslations('admin.NOTIFICATIONS');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use the useAdminNotifications hook
  const {
    notifications,
    stats,
    isLoading,
    isFetching,
    isMarkingAsRead,
    isMarkingAllAsRead,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    getNotificationLink,
  } = useAdminNotifications();
  
  // Extract unread count from stats with fallback
  const unreadCount = stats?.unread ?? 0;
  

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);


  // Get notification icon based on type (no unused iconProps)
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "item_submission":
        return <ExternalLink className="h-5 w-5 text-blue-500" />;
      case "comment_reported":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "user_registered":
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case "payment_failed":
        return <CreditCard className="h-5 w-5 text-red-500" />;
      case "system_alert":
        return <Settings className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get notification type label
  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "item_submission":
        return t('NOTIFICATION_TYPES.NEW_SUBMISSION');
      case "comment_reported":
        return t('NOTIFICATION_TYPES.REPORTED_COMMENT');
      case "user_registered":
        return t('NOTIFICATION_TYPES.NEW_USER');
      case "payment_failed":
        return t('NOTIFICATION_TYPES.PAYMENT_ISSUE');
      case "system_alert":
        return t('NOTIFICATION_TYPES.SYSTEM_ALERT');
      default:
        return t('NOTIFICATION_TYPES.NOTIFICATION');
    }
  };

  // Get notification priority color
  const getNotificationPriorityColor = (type: string) => {
    switch (type) {
      case "payment_failed":
      case "system_alert":
        return "border-red-500";
      case "comment_reported":
        return "border-orange-500";
      case "item_submission":
        return "border-blue-500";
      case "user_registered":
        return "border-green-500";
      default:
        return "border-gray-300";
    }
  };



  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative transition-all duration-200 ${
          isOpen 
            ? "bg-primary/10 text-primary hover:bg-primary/20" 
            : "hover:bg-muted/50"
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="admin-notifications-dropdown"
      >
        <Bell className={`h-5 w-5 transition-transform duration-200 ${
          isOpen ? "scale-110" : ""
        }`} />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium animate-pulse"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div
          id="admin-notifications-dropdown"
          role="menu"
          className="absolute right-0 top-12 w-[420px] z-50 animate-in slide-in-from-top-2 duration-200"
        >
          <Card className="shadow-xl border bg-background/95 backdrop-blur-xs">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">{t('TITLE')}</CardTitle>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                      {unreadCount} {t('NEW')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNotifications()}
                    className="h-8 w-8 p-0"
                    disabled={isLoading || isFetching}
                    aria-label="Refresh notifications"
                  >
                    <RefreshCw className={`h-4 w-4 ${(isLoading || isFetching) ? "animate-spin" : ""}`} />
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead()}
                      className="text-xs h-8 px-3"
                      disabled={isMarkingAllAsRead}
                    >
                      {isMarkingAllAsRead ?t( "LOADING") : t( "MARK_ALL_READ")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0"
                    aria-label="Close notifications panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                    <h3 className="font-medium text-sm text-foreground mb-1">Error loading notifications</h3>
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {error}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchNotifications()}
                      className="text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Try Again
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">{t('LOADING')}</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-sm text-foreground mb-1">{t('NO_NOTIFICATIONS')}</h3>
                    <p className="text-xs text-muted-foreground text-center">
                      {t('ALL_CAUGHT_UP')}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notification) => (
                      <div
                        role="button"
                        aria-label={`${notification.type} notification: ${notification.title || notification.message}`}
                        tabIndex={0}
                        key={notification.id}
                        className={`relative p-4 hover:bg-muted/30 cursor-pointer transition-all duration-200 border-l-4 ${
                          getNotificationPriorityColor(notification.type)
                        } ${
                          !notification.isRead 
                            ? "bg-primary/5 hover:bg-primary/10" 
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                      >
                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <div className="absolute top-4 left-2 w-2 h-2 bg-primary rounded-full"></div>
                        )}
                        
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-2 py-0 h-5 font-normal"
                                  >
                                    {getNotificationTypeLabel(notification.type)}
                                  </Badge>
                                  {!notification.isRead && (
                                    <Badge 
                                      variant="default" 
                                      className="text-xs px-1.5 py-0 h-4 font-normal"
                                    >
                                      {t('NEW_BADGE')}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className={`font-medium text-sm leading-snug ${
                                  !notification.isRead 
                                    ? "text-foreground" 
                                    : "text-muted-foreground"
                                }`}>
                                  {notification.title}
                                </h4>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-primary/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(notification.id);
                                    }}
                                    disabled={isMarkingAsRead}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                  locale: enUS,
                                })}
                              </span>
                              
                              {getNotificationLink(notification) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(getNotificationLink(notification)!, "_blank");
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {t('VIEW_DETAILS')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer with view all link */}
              {notifications.length > 0 && (
                <>
                  <div className="border-t border-border/50" />
                  <div className="p-3 bg-muted/20">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center text-sm h-8"
                      onClick={() => {
                        // Navigate to full notifications page
                        router.push("/admin/notifications");
                      }}
                    >
                      {t('VIEW_ALL_NOTIFICATIONS')}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
