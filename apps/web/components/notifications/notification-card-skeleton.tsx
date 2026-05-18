'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function NotificationCardSkeleton() {
	return (
		<div className="flex gap-3 rounded-md border-l-2 border-transparent px-3 py-3">
			<Skeleton className="h-9 w-9 rounded-full" />
			<div className="flex flex-1 flex-col gap-2">
				<Skeleton className="h-3 w-2/3" />
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-2 w-16" />
			</div>
		</div>
	);
}

export function NotificationListSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-1">
			{Array.from({ length: rows }).map((_, i) => (
				<NotificationCardSkeleton key={i} />
			))}
		</div>
	);
}
