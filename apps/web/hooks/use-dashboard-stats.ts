import { useQuery } from "@tanstack/react-query";
import type {
    PeriodComparisonDataExport,
    CategoryPerformanceDataExport,
    ApprovalTrendDataExport,
    SubmissionCalendarDataExport,
    EngagementDistributionData,
} from "@/lib/repositories/client-dashboard.repository";

// Re-export types for component usage
export type {
    PeriodComparisonDataExport,
    CategoryPerformanceDataExport,
    ApprovalTrendDataExport,
    SubmissionCalendarDataExport,
    EngagementDistributionData,
};

interface ActivityData {
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}

interface SubmissionTimelineData {
  month: string;
  submissions: number;
}

interface EngagementOverviewData {
  week: string;
  votes: number;
  comments: number;
}

interface StatusBreakdownData {
  status: 'Approved' | 'Pending' | 'Rejected';
  value: number;
  color: string;
  [key: string]: string | number;
}

interface TopItem {
  id: string;
  title: string;
  views: number;
  votes: number;
  comments: number;
}

export interface UserStats {
  totalSubmissions: number;
  totalViews: number;
  totalVotesReceived: number;
  totalCommentsReceived: number;
  viewsAvailable: boolean;
  recentActivity: {
    newSubmissions: number;
    newViews: number;
  };
  uniqueItemsInteracted: number;
  totalActivity: number;
  activityChartData: ActivityData[];
  engagementChartData: { name: string; value: number; color: string }[];
  submissionTimeline: SubmissionTimelineData[];
  engagementOverview: EngagementOverviewData[];
  statusBreakdown: StatusBreakdownData[];
  topItems: TopItem[];
  periodComparison: PeriodComparisonDataExport;
  categoryPerformance: CategoryPerformanceDataExport[];
  approvalTrend: ApprovalTrendDataExport[];
  submissionCalendar: SubmissionCalendarDataExport[];
  engagementDistribution: EngagementDistributionData[];
}

export function useDashboardStats() {
  return useQuery<UserStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch('/api/client/dashboard/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch dashboard stats');
      }

      // Extract stats from response (remove success field)
      const { success: _success, ...stats } = data;
      return stats as UserStats;
    },
    staleTime: 5 * 60 * 1000,
  });
} 