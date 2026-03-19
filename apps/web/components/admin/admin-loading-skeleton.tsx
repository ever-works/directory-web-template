import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Design system constants
const SHIMMER_STYLES = "animate-pulse bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700";
const STATS_CARD_STYLES = "bg-white dark:bg-gray-900 rounded-xl shadow-xs p-6 border border-gray-200 dark:border-gray-700";
const SKELETON_CONTAINER_STYLES = "flex items-center space-x-2";
const SKELETON_ICON_CONTAINER_STYLES = "p-2 bg-gray-200 dark:bg-gray-700 rounded-lg";
const SKELETON_CONTENT_STYLES = "flex-1";

// Stats Card Skeleton
export function AdminStatsCardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading" className={STATS_CARD_STYLES}>
      <div className={SKELETON_CONTAINER_STYLES}>
        <div className={`${SKELETON_ICON_CONTAINER_STYLES} ${SHIMMER_STYLES}`}>
          <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded-sm"></div>
        </div>
        <div className={SKELETON_CONTENT_STYLES}>
          <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded-sm mb-2 ${SHIMMER_STYLES}`}></div>
          <div className={`h-8 bg-gray-200 dark:bg-gray-700 rounded-sm ${SHIMMER_STYLES}`}></div>
        </div>
      </div>
    </div>
  );
}

// Chart Skeleton
export function AdminChartSkeleton() {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading chart">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 space-y-3">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-end space-x-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton 
                className="w-full" 
                style={{ height: `${((i % 4) + 1) * 16 + 16}px` }} 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Activity List Skeleton
export function AdminActivityListSkeleton({ itemCount = 4 }: { itemCount?: number }) {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading activity">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: itemCount }, (_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Table Skeleton
export function AdminTableSkeleton({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading table">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex space-x-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            {Array.from({ length: columns }, (_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex space-x-4 py-2">
              {Array.from({ length: columns }, (_, j) => (
                <Skeleton key={j} className="h-4 w-24" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Pie Chart Skeleton
export function AdminPieChartSkeleton() {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading chart">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid Skeleton for multiple items
export function AdminGridSkeleton({ 
  items = 4, 
  className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" 
}: { 
  items?: number; 
  className?: string; 
}) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading overview" className={className}>
      {Array.from({ length: items }, (_, i) => (
        <AdminStatsCardSkeleton key={i} />
      ))}
    </div>
  );
}
