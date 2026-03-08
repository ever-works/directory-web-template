import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverClient, apiUtils } from "@/lib/api/server-api-client";

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

export interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Query keys for React Query
const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  lists: () => [...NOTIFICATION_KEYS.all, 'list'] as const,
  list: (filters: string) => [...NOTIFICATION_KEYS.lists(), { filters }] as const,
  details: () => [...NOTIFICATION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...NOTIFICATION_KEYS.details(), id] as const,
  stats: () => [...NOTIFICATION_KEYS.all, 'stats'] as const,
};

// API functions using server-api-client
const notificationApi = {
  // Fetch notifications
  async fetchNotifications(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const response = await serverClient.get<{ notifications: Notification[]; unreadCount: number }>(
      "/api/admin/notifications"
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ success: boolean; notification: Notification }> {
    const response = await serverClient.patch<{ success: boolean; notification: Notification }>(
      `/api/admin/notifications/${notificationId}/read`
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ success: boolean; updatedCount: number }> {
    const response = await serverClient.patch<{ success: boolean; updatedCount: number }>(
      "/api/admin/notifications/mark-all-read"
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },

  // Create notification
  async createNotification(data: CreateNotificationData & { userId: string }): Promise<{ success: boolean; notification: Notification }> {
    const response = await serverClient.post<{ success: boolean; notification: Notification }>(
      "/api/admin/notifications",
      data
    );
    
    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response));
    }
    
    return response.data;
  },
};

export function useAdminNotifications() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const {
    data: notificationData,
    isLoading,
    isFetching,
    error,
    refetch: fetchNotifications,
  } = useQuery({
    queryKey: NOTIFICATION_KEYS.lists(),
    queryFn: notificationApi.fetchNotifications,
    enabled: !!session?.user?.id,
    refetchInterval: 5 * 60 * 1000, // 5 minutes instead of 30 seconds
    refetchIntervalInBackground: false, // Don't poll in background
    staleTime: 2 * 60 * 1000, // 2 minutes instead of 10 seconds
    gcTime: 10 * 60 * 1000, // Increased garbage collection time
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: (data, notificationId) => {
      queryClient.setQueryData(NOTIFICATION_KEYS.lists(), (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.map((notif: Notification) =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          ),
          unreadCount: Math.max(0, oldData.unreadCount - 1),
        };
      });

      // Invalidate related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.stats() });
    },
    onError: (error) => {
      console.error("Failed to mark notification as read:", error);
    },
  });

  // Mutation for marking all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      // Optimistically update the cache
      queryClient.setQueryData(NOTIFICATION_KEYS.lists(), (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          notifications: oldData.notifications.map((notif: Notification) => ({
            ...notif,
            isRead: true,
          })),
          unreadCount: 0,
        };
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.stats() });
    },
    onError: (error) => {
      console.error("Failed to mark all notifications as read:", error);
    },
  });

  // Mutation for creating notifications
  const createNotificationMutation = useMutation({
    mutationFn: (data: CreateNotificationData) =>
      notificationApi.createNotification({
        ...data,
        userId: session?.user?.id || "",
      }),
    onSuccess: () => {
      // Invalidate notifications list to refetch
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.stats() });
    },
    onError: (error) => {
      console.error("Failed to create notification:", error);
    },
  });

  // Computed values with fallbacks
  const notifications = notificationData?.notifications ?? [];
  const unreadCount = notificationData?.unreadCount ?? 0;
  
  // Calculate stats from notifications
  const stats: NotificationStats = {
    total: notifications.length,
    unread: unreadCount,
    byType: notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Wrapper functions
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await markAsReadMutation.mutateAsync(notificationId);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to mark notification as read" 
      };
    }
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(async () => {
    try {
      const result = await markAllAsReadMutation.mutateAsync();
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to mark all notifications as read" 
      };
    }
  }, [markAllAsReadMutation]);

  const createNotification = useCallback(async (notificationData: CreateNotificationData) => {
    if (!session?.user?.id) {
      return { success: false, error: "No session" };
    }

    try {
      const result = await createNotificationMutation.mutateAsync(notificationData);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create notification" 
      };
    }
  }, [session?.user?.id, createNotificationMutation]);

  // Get notification link
  const getNotificationLink = useCallback((notification: Notification) => {
    if (!notification.data) return null;

    try {
      const data = JSON.parse(notification.data);
      switch (notification.type) {
        case "item_submission":
          return `/admin/items/${data.itemId}`;
        case "comment_reported":
          return `/admin/comments/${data.commentId}`;
        case "user_registered":
          return `/admin/users/${data.userId}`;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    const link = getNotificationLink(notification);
    
    if (link) {
      window.open(link, "_blank");
    }

    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  }, [getNotificationLink, markAsRead]);

  // Loading states for mutations
  const isMarkingAsRead = markAsReadMutation.isPending;
  const isMarkingAllAsRead = markAllAsReadMutation.isPending;
  const isCreating = createNotificationMutation.isPending;

  return {
    // Data
    notifications,
    stats,
    
    // Loading states
    isLoading,
    isFetching,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isCreating,
    
    // Error handling
    error: error?.message || null,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    getNotificationLink,
    handleNotificationClick,
    
    // Mutation states
    markAsReadMutation,
    markAllAsReadMutation,
    createNotificationMutation,
  };
}
