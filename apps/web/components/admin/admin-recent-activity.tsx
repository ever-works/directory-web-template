import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { UserPlus, FileText, MessageSquare, ThumbsUp, Activity } from "lucide-react";
import { AdminActivityListSkeleton } from "./admin-loading-skeleton";


interface AdminRecentActivityProps {
  data: AdminStats['recentActivity'];
  isLoading: boolean;
}

export function AdminRecentActivity({ data, isLoading }: AdminRecentActivityProps) {
  if (isLoading) {
    return <AdminActivityListSkeleton itemCount={4} />;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'submission':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'vote':
        return <ThumbsUp className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'submission':
        return 'bg-blue-100 dark:bg-blue-900/20';
      case 'comment':
        return 'bg-purple-100 dark:bg-purple-900/20';
      case 'vote':
        return 'bg-orange-100 dark:bg-orange-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-600" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            data.map((activity, index) => (
              <div key={`${activity.timestamp}-${activity.description}-${index}`} className="flex items-start space-x-3 group dark:bg-slate-800">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)} group-hover:scale-110 transition-transform`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {activity.user && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        by {activity.user}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {activity.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {data.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="text-sm text-theme-primary hover:text-theme-primary/80 font-medium transition-colors">
              View all activity →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 