'use client';

import { Card, CardHeader, CardBody } from '@heroui/react';
import { cn } from '@/lib/utils';

interface ItemSkeletonProps {
	className?: string;
	showCategory?: boolean;
	showHashtags?: boolean;
	showDescription?: boolean;
}

export default function ItemSkeleton({
	className,
	showCategory = true,
	showHashtags = true,
	showDescription = true
}: ItemSkeletonProps) {
	const cardClassName = cn(
		'group relative border-0 rounded-2xl backdrop-blur-xl overflow-hidden h-full',
		'bg-white/80 dark:bg-gray-900/80 shadow-lg',
		'ring-1 ring-gray-200/50 dark:ring-gray-700/50',
		className
	);

	return (
		<Card className={cardClassName}>
			<div className="absolute inset-0 bg-linear-to-br from-gray-50/60 via-white/90 to-gray-100/80 dark:from-gray-900/60 dark:via-gray-800/80 dark:to-black/80" />

			{/* Content container */}
			<div className="relative z-10">
				<CardHeader className="flex gap-4 pb-4">
					<div className="flex flex-col grow gap-4 min-w-0">
						<div className="flex justify-between items-start gap-3">
							<div className="flex items-center gap-4">
								{/* Icon skeleton */}
								<div className="shrink-0">
									<div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
								</div>

								{/* Title skeleton */}
								<div className="flex-1 min-w-0">
									<div className="h-5 w-full max-w-[120px] sm:max-w-[160px] bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-1" />
									<div className="w-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
								</div>
							</div>

							{/* Right side badges skeleton */}
							<div className="flex items-center gap-2 shrink-0">
								<div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
								<div className="w-12 sm:w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
							</div>
						</div>

						{/* Category skeleton */}
						{showCategory && (
							<div className="flex items-center gap-2">
								<div className="h-6 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
							</div>
						)}
					</div>
				</CardHeader>

				<CardBody className="px-6 py-4 pt-0">
					<div className="space-y-5">
						{/* Description skeleton */}
						{showDescription && (
							<div className="space-y-2">
								<div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
								<div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
								<div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
							</div>
						)}

						{/* Hashtags skeleton */}
						{showHashtags && (
							<div className="flex flex-wrap gap-2">
								<div className="h-6 w-16 sm:w-20 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
								<div className="h-6 w-20 sm:w-24 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
								<div className="h-6 w-14 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse" />
							</div>
						)}
					</div>
				</CardBody>
			</div>
		</Card>
	);
}

// Grid skeleton component for multiple items
export function ItemSkeletonGrid({
	count = 15,
	LayoutComponent
}: {
	count?: number;
	LayoutComponent: React.ComponentType<{ children: React.ReactNode }>;
}) {
	return (
		<div className="min-h-screen pb-20">
			<LayoutComponent>
				{Array.from({ length: count }).map((_, i) => (
					<ItemSkeleton key={i} />
				))}
			</LayoutComponent>
		</div>
	);
}
