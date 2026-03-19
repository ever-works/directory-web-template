import { Card, CardBody, Skeleton } from '@heroui/react';

export function LoadingSkeleton() {
	return (
		<div className="p-6 max-w-7xl mx-auto">
			{/* Page Header Skeleton */}
			<div className="mb-8">
				<Card className="border-0 shadow-lg">
					<CardBody className="p-6">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-4">
								<Skeleton className="w-12 h-12 rounded-xl" />
								<div>
									<Skeleton className="w-48 h-8 mb-2 rounded-lg" />
									<Skeleton className="w-64 h-4 rounded-lg" />
								</div>
							</div>
							<Skeleton className="w-32 h-12 rounded-lg" />
						</div>
					</CardBody>
				</Card>
			</div>

			{/* Stats Skeleton */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
				{[1, 2, 3].map((i) => (
					<Card key={i} className="border-0 shadow-lg">
						<CardBody className="p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<Skeleton className="w-24 h-4 mb-2 rounded-lg" />
									<Skeleton className="w-16 h-8 mb-2 rounded-lg" />
									<Skeleton className="w-20 h-3 rounded-lg" />
								</div>
								<Skeleton className="w-12 h-12 rounded-xl" />
							</div>
						</CardBody>
					</Card>
				))}
			</div>

			{/* Filters Skeleton */}
			<Card className="mb-6 border-0 shadow-lg">
				<CardBody className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Skeleton className="w-full h-12 rounded-lg" />
						<Skeleton className="w-full h-12 rounded-lg" />
					</div>
				</CardBody>
			</Card>

			{/* Table Skeleton */}
			<Card className="border-0 shadow-lg">
				<CardBody className="p-0">
					<div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
						<div className="flex items-center justify-between">
							<Skeleton className="w-32 h-6 rounded-lg" />
							<Skeleton className="w-24 h-4 rounded-lg" />
						</div>
					</div>
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{[1, 2, 3, 4, 5].map((i) => (
							<div key={i} className="px-6 py-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4 flex-1">
										<Skeleton className="w-10 h-10 rounded-lg" />
										<div className="flex-1">
											<Skeleton className="w-48 h-5 mb-2 rounded-lg" />
											<Skeleton className="w-64 h-4 rounded-lg" />
										</div>
									</div>
									<div className="flex items-center space-x-4">
										<Skeleton className="w-20 h-6 rounded-full" />
										<Skeleton className="w-24 h-4 rounded-lg" />
										<div className="flex space-x-2">
											<Skeleton className="w-16 h-8 rounded-lg" />
											<Skeleton className="w-16 h-8 rounded-lg" />
										</div>
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
