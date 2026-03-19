import { useQuery } from "@tanstack/react-query";

// Custom HTTP error class for better error handling
class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export interface AdminStats {
  // Platform Overview
  totalUsers: number;
  registeredUsers: number; // Renamed from activeUsers for clarity
  newUsersToday: number;
  newUsersLast7Days: number; // Changed from newUsersThisWeek for clarity (rolling window)
  newUsersLast30Days: number; // Changed from newUsersThisMonth for clarity (rolling window)
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  
  // User Activity
  totalViews: number;
  totalVotes: number;
  totalComments: number;
  
  // Newsletter
  totalSubscribers: number;
  recentSubscribers: number;
  
  // Trends
  userGrowthData: { month: string; users: number; active: number }[];
  submissionStatusData: { status: string; count: number; color: string }[];
  activityTrendData: { day: string; views: number; votes: number; comments: number }[];
  topItemsData: { name: string; views: number; votes: number }[];
  
  // Recent Activity
  recentActivity: {
    type: 'user_signup' | 'submission' | 'comment' | 'vote';
    description: string;
    timestamp: string;
    user?: string;
  }[];
}

interface ApiResponse {
  success: boolean;
  data: AdminStats;
  error?: string;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/admin/dashboard/stats', {
        signal,
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      
      if (!response.ok) {
        let message = `Request failed: ${response.status}`;
        try {
          const errBody = await response.json();
          if (errBody?.error) message = String(errBody.error);
        } catch {}
        throw new HttpError(message, response.status);
      }
      
      const result: ApiResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch admin stats');
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status < 500) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
} 