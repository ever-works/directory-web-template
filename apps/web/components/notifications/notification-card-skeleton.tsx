'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton row that mirrors the real NotificationCard layout exactly
 * (icon chip + title/message stack + meta line) so the transition
 * from loading to loaded is jitter-free.
 */
export function NotificationCardSkeleton() {
	return (
		<div className="flex gap-3 px-4 py-3 border-l-[3px] border-transparent">
			<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3.5 w-2/3 rounded" />
						<Skeleton className="h-3 w-full rounded" />
					</div>
					<Skeleton className="h-3 w-8 shrink-0 rounded" />
				</div>
				<div className="mt-2 flex items-center gap-2">
					<Skeleton className="h-5 w-20 rounded-md" />
					<Skeleton className="h-5 w-12 rounded-md" />
				</div>
			</div>
		</div>
	);
}

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="divide-y divide-gray-100 dark:divide-white/8">
			{Array.from({ length: rows }).map((_, i) => (
				<NotificationCardSkeleton key={i} />
			))}
		</div>
	);
}
