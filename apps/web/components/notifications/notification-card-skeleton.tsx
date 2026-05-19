'use client';

import { Skeleton } from '@/components/ui/skeleton';

import type { NotificationCardView } from './notification-card';

/**
 * Skeleton row / tile.  Mirrors the real NotificationCard geometry in
 * both list and grid variants so the loading → loaded transition is
 * jitter-free.
 */
export function NotificationCardSkeleton({ view = 'list' }: { view?: NotificationCardView }) {
	if (view === 'grid') {
		return (
			<div className="flex h-full min-h-[180px] flex-col gap-2.5 p-4 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/2">
				<div className="flex items-start gap-3">
					<Skeleton className="h-9 w-9 rounded-lg shrink-0" />
					<Skeleton className="flex-1 h-3.5 rounded mt-0.5" />
				</div>
				<div className="flex-1 space-y-1.5">
					<Skeleton className="h-3 w-full rounded" />
					<Skeleton className="h-3 w-5/6 rounded" />
					<Skeleton className="h-3 w-2/3 rounded" />
				</div>
				<div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
					<Skeleton className="h-5 w-20 rounded-md" />
					<Skeleton className="h-3 w-8 rounded" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex gap-3 px-4 py-3">
			<Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
			<div className="flex-1 min-w-0">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 space-y-1.5">
						<Skeleton className="h-3.5 w-2/3 rounded" />
						<Skeleton className="h-3 w-full rounded" />
					</div>
					<Skeleton className="h-3 w-8 shrink-0 rounded" />
				</div>
				<div className="mt-1.5 flex items-center gap-2">
					<Skeleton className="h-4 w-20 rounded-md" />
				</div>
			</div>
		</div>
	);
}

export function NotificationListSkeleton({
	rows = 5,
	view = 'list'
}: {
	rows?: number;
	view?: NotificationCardView;
}) {
	if (view === 'grid') {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
				{Array.from({ length: rows }).map((_, i) => (
					<NotificationCardSkeleton key={i} view="grid" />
				))}
			</div>
		);
	}
	return (
		<div className="divide-y divide-gray-100 dark:divide-white/8">
			{Array.from({ length: rows }).map((_, i) => (
				<NotificationCardSkeleton key={i} view="list" />
			))}
		</div>
	);
}
