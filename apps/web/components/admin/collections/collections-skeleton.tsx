import { Card, CardBody } from '@heroui/react';
import { Skeleton } from '@/components/ui/skeleton';

export function CollectionsSkeleton({ itemCount = 7 }: { itemCount?: number }) {
	return (
		<div className="p-6 max-w-7xl mx-auto" role="status" aria-live="polite" aria-busy="true">
			<span className="sr-only">Loading collections…</span>
			{/* Page Header - matching the image */}
			<div className="mb-6" aria-hidden="true">
				<div className="flex items-center justify-between">
					<Skeleton className="h-9 w-40 rounded-lg" />
					<Skeleton className="h-5 w-20 rounded-lg" />
				</div>
			</div>

			{/* Collections Card Skeleton */}
			<Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xs" aria-hidden="true">
				<CardBody className="p-0">
					{/* Card Header */}
					<div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
						<Skeleton className="h-6 w-32 rounded-lg" />
						<Skeleton className="h-4 w-24 rounded-lg" />
					</div>

					{/* Collections List */}
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{Array.from({ length: itemCount }, (_, i) => (
							<div key={i} className="px-6 py-4">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="flex items-start gap-4 flex-1 min-w-0">
										{/* Icon Skeleton - square shape */}
										<Skeleton className="w-10 h-10 rounded-lg shrink-0" />

										{/* Content Skeleton */}
										<div className="flex-1 min-w-0 space-y-2">
											{/* Title and badges row */}
											<div className="flex items-center gap-2 flex-wrap">
												<Skeleton className="h-5 w-48 rounded-lg" />
												<Skeleton className="h-6 w-16 rounded-full" />
												<Skeleton className="h-6 w-20 rounded-full" />
											</div>

											{/* Slug skeleton */}
											<Skeleton className="h-3.5 w-32 rounded-lg" />

											{/* Description skeleton - 2-3 lines */}
											<div className="space-y-1.5">
												<Skeleton className="h-4 w-full rounded-lg" />
												<Skeleton className="h-4 w-5/6 rounded-lg" />
											</div>
										</div>
									</div>

									{/* Action buttons skeleton - visible on hover/selection */}
									<div className="flex items-center gap-2">
										<Skeleton className="h-9 w-28 rounded-lg" />
										<Skeleton className="h-9 w-20 rounded-lg" />
										<Skeleton className="h-9 w-20 rounded-lg" />
									</div>
								</div>
							</div>
						))}
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
