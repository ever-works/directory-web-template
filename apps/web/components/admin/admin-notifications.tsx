"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, X, Check, ExternalLink, RefreshCw, AlertCircle, UserPlus, CreditCard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface AdminNotificationsProps {
  className?: string;
}

export function AdminNotifications({ className }: AdminNotificationsProps) {
  const router = useRouter();
  const t = useTranslations('admin.NOTIFICATIONS');
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
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




  const tooltipLabel = unreadCount > 0
    ? `${t('TITLE')} (${unreadCount} ${t('NEW')})`
    : t('TITLE');

  const showTooltip = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setTooltipPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    setHovered(true);
  };
  const hideTooltip = () => setHovered(false);

  return (
    <>
      <div className={cn("relative", className)} ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            hideTooltip();
            setIsOpen(!isOpen);
          }}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          aria-label={tooltipLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls="admin-notifications-dropdown"
          className={cn(
            "relative inline-flex items-center justify-center h-9 cursor-pointer",
            "flex items-center gap-1.5 transition-all duration-200",
            "font-medium whitespace-nowrap",
            "text-sm lg:text-base xl:text-lg",
            "text-gray-700 dark:text-gray-300",
            "hover:text-theme-primary dark:hover:text-theme-primary",
            "hover:scale-105"
          )}
        >
          <Bell className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5",
                "min-w-[16px] h-4 px-1",
                "inline-flex items-center justify-center",
                "rounded-full",
                "bg-red-500 text-white",
                "text-[10px] font-semibold leading-none tabular-nums",
                "ring-2 ring-white dark:ring-[#0a0a0a]",
                "animate-pulse"
              )}
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {isOpen && (
          <div
            id="admin-notifications-dropdown"
            role="menu"
            className={cn(
              "absolute right-0 top-12 z-50",
              "w-[420px] max-w-[calc(100vw-1rem)]",
              "rounded-2xl overflow-hidden",
              "bg-white dark:bg-[#141414] backdrop-blur-xl",
              "ring-1 ring-black/5 dark:ring-white/10",
              "shadow-2xl shadow-black/10 dark:shadow-black/40",
              "animate-in slide-in-from-top-2 fade-in duration-300"
            )}
          >
            <div className="flex flex-col">
              <div className="px-4 pt-3.5 pb-3 border-b border-gray-100 dark:border-white/8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('TITLE')}</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-medium rounded-md">
                        {unreadCount} {t('NEW')}
                      </Badge>
                    )}
                  </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNotifications()}
                    className="h-7 w-7 p-0 rounded-md"
                    disabled={isLoading || isFetching}
                    aria-label={t('REFRESH')}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${(isLoading || isFetching) ? "animate-spin" : ""}`} />
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAllAsRead()}
                      className="text-xs h-7 px-2.5 rounded-md font-medium"
                      disabled={isMarkingAllAsRead}
                    >
                      {isMarkingAllAsRead ? t("LOADING") : t("MARK_ALL_READ")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 p-0 rounded-md"
                    aria-label={t('CLOSE')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <AlertCircle className="h-8 w-8 text-destructive mb-3" />
                    <h3 className="font-medium text-sm text-foreground mb-1">{t('ERROR_LOADING')}</h3>
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
                      {t('TRY_AGAIN')}
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
                  <div className="border-t border-gray-100 dark:border-white/8">
                    {notifications.map((notification) => (
                      <div
                        role="button"
                        aria-label={`${notification.type} notification: ${notification.title || notification.message}`}
                        tabIndex={0}
                        key={notification.id}
                        className={cn(
                          "group/row relative flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-inset",
                          !notification.isRead
                            ? "bg-primary/3 hover:bg-primary/6 dark:bg-white/2 dark:hover:bg-white/4"
                            : "hover:bg-gray-50 dark:hover:bg-white/3"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleNotificationClick(notification);
                          }
                        }}
                      >
                        {/* Icon with unread dot */}
                        <div className="relative shrink-0 pt-0.5">
                          {!notification.isRead && (
                            <span className="absolute -left-1 top-2 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                          )}
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/6 transition-transform duration-200 group-hover/row:scale-105">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={cn(
                              "text-[13px] leading-snug truncate",
                              !notification.isRead ? "font-semibold text-gray-900 dark:text-white" : "font-normal text-gray-700 dark:text-gray-300"
                            )}>
                              {notification.title}
                            </p>
                            <time
                              className="shrink-0 text-[11px] text-gray-500 dark:text-gray-500 tabular-nums whitespace-nowrap mt-0.5"
                              title={new Date(notification.createdAt).toLocaleString()}
                            >
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: false, locale: enUS })
                                .replace('about ', '').replace(' ago', '')}
                            </time>
                          </div>

                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>

                          {/* Meta row */}
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-white/6 px-1.5 h-4 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                              {getNotificationTypeLabel(notification.type)}
                            </span>

                            <div className={cn(
                              "flex items-center gap-0.5 shrink-0",
                              "opacity-0 -translate-x-1 transition-all duration-150",
                              "group-hover/row:opacity-100 group-hover/row:translate-x-0",
                              "group-focus-within/row:opacity-100 group-focus-within/row:translate-x-0",
                              "motion-reduce:opacity-100 motion-reduce:translate-x-0"
                            )}>
                              {getNotificationLink(notification) && (
                                <button
                                  type="button"
                                  aria-label={t('VIEW_DETAILS')}
                                  title={t('VIEW_DETAILS')}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(getNotificationLink(notification)!, "_blank");
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </button>
                              )}
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  aria-label={t('MARK_ALL_READ')}
                                  title={t('MARK_ALL_READ')}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  disabled={isMarkingAsRead}
                                >
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                </button>
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
                  <div className="border-t border-gray-100 dark:border-white/8" />
                  <div className="px-3 py-2.5 bg-gray-50/50 dark:bg-white/2">
                    <Button
                      variant="ghost"
                      className="w-full justify-center text-sm h-8 font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg"
                      onClick={() => {
                        router.push("/admin/notifications");
                      }}
                    >
                      {t('VIEW_ALL_NOTIFICATIONS')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {hovered && !isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
          style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateX(-50%)' }}
        >
          {tooltipLabel}
        </div>,
        document.body
      )}
    </>
  );
}
