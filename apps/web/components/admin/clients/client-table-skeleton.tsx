import { Skeleton } from "@/components/ui/skeleton";

interface ClientTableSkeletonProps {
  rows?: number;
}

export function ClientTableSkeleton({ rows = 10 }: ClientTableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden" aria-hidden="true">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-12 gap-4 items-center">
          <div className="col-span-3">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-18" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="col-span-1">
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`client-row-${index}`} className="px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Client Info */}
              <div className="col-span-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>

              {/* Status */}
              <div className="col-span-2">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Plan */}
              <div className="col-span-2">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              {/* Provider */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-5 rounded-sm" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-2 space-y-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>

              {/* Actions */}
              <div className="col-span-1">
                <div className="flex space-x-1">
                  <Skeleton className="h-8 w-8 rounded-sm" />
                  <Skeleton className="h-8 w-8 rounded-sm" />
                  <Skeleton className="h-8 w-8 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}