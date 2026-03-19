import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/hooks/use-admin-stats";
import { Trophy, Eye, ThumbsUp } from "lucide-react";
import { AdminTableSkeleton } from "./admin-loading-skeleton";
import { useTranslations } from "next-intl";


interface AdminTopItemsProps {
  data: AdminStats['topItemsData'];
  isLoading: boolean;
}

export function AdminTopItems({ data, isLoading }: AdminTopItemsProps) {
  const t = useTranslations('admin.TOP_ITEMS');
  
  const getRankingBadgeClass = (index: number): string => {
    const baseClass = "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold";
    
    if (index === 0) {
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
    } else if (index === 1) {
      return `${baseClass} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    } else if (index === 2) {
      return `${baseClass} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400`;
    } else {
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
    }
  };

  if (isLoading) {
    return <AdminTableSkeleton rows={5} columns={3} />;
  }

  const maxViews = data.length > 0 ? Math.max(...data.map(item => item.views)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          <span>{t('TITLE')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('NO_ITEMS_FOUND')}</p>
            </div>
          ) : (
            data.map((item, index) => (
              <div key={index} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={getRankingBadgeClass(index)}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-theme-primary transition-colors">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <Eye className="h-3 w-3" />
                      <span>{item.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{item.votes}</span>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar for views */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-linear-to-r from-theme-primary to-theme-accent h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(item.views / maxViews) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
        
        {data.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button className="text-sm text-theme-primary hover:text-theme-primary/80 font-medium transition-colors">
              {t('VIEW_ALL_ITEMS')}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 