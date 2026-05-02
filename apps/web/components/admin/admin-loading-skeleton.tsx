import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_BAR_HEIGHTS = [55, 72, 48, 85, 60, 90, 45, 78, 65, 82, 50, 70];

// Stats Card Skeleton — matches real StatsCard layout exactly
export function AdminStatsCardSkeleton() {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Chart Skeleton — bar chart shape
export function AdminChartSkeleton() {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading chart">
      <CardHeader className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="h-2.5 w-2.5 rounded-sm" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">
        <div className="flex items-end gap-1.5 h-48">
          {CHART_BAR_HEIGHTS.map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-6" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Activity List Skeleton — matches timeline layout
export function AdminActivityListSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading activity">
      <CardHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        <div className="relative space-y-0">
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-100 dark:bg-white/6" />
          {Array.from({ length: itemCount }, (_, i) => (
            <div key={i} className="relative flex gap-4 pb-4 last:pb-0">
              <Skeleton className="relative z-10 h-8 w-8 rounded-xl shrink-0" />
              <div className="flex-1 pt-0.5 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <Skeleton className="h-3.5 flex-1 max-w-[200px]" />
                  <Skeleton className="h-3 w-12 shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/6">
          <Skeleton className="h-3.5 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

// Table Skeleton — matches top-items ranked list layout
export function AdminTableSkeleton({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading table">
      <CardHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        <div className="space-y-1">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-6 w-6 rounded-lg shrink-0" />
                <Skeleton className="h-3.5 flex-1" />
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
              <div className="ml-9">
                <Skeleton
                  className="h-1 rounded-full"
                  style={{ width: `${Math.max(30, 100 - i * 15)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/6">
          <Skeleton className="h-3.5 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Pie Chart Skeleton — matches submission status layout
export function AdminPieChartSkeleton() {
  return (
    <Card role="status" aria-live="polite" aria-label="Loading chart">
      <CardHeader className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-md" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-3">
        <div className="space-y-5">
          <div className="flex justify-center py-3">
            <div className="relative">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="h-16 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-2.5 w-2.5 rounded-sm shrink-0" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-8 tabular-nums" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-white/6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid Skeleton — stats overview layout
export function AdminGridSkeleton({
  items = 4,
  className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
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
