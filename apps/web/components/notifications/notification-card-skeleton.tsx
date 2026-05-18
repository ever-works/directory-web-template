'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function NotificationCardSkeleton() {
	return (
		<div className="px-4 py-3.5 border-l-[3px] border-transparent">
			<div className="flex items-start gap-3">
				<Skeleton className="h-5 w-5 rounded shrink-0" />
				<div className="flex-1 space-y-2">
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-20 rounded-md" />
						<Skeleton className="h-4 w-10 rounded-md" />
					</div>
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-16" />
				</div>
			</div>
		</div>
	);
}

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="divide-y divide-border/50">
			{Array.from({ length: rows }).map((_, i) => (
				<NotificationCardSkeleton key={i} />
			))}
		</div>
	);
}
