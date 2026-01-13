import { Card, CardBody } from '@heroui/react';

/**
 * Loading Skeleton Component
 * Displays loading state for the clients page
 * Following SRP: Only responsible for loading UI
 */
export function LoadingSkeleton() {
	return (
		<div className="p-6 max-w-7xl mx-auto min-h-screen pb-20">
			{/* Loading Header */}
			<div className="mb-8">
				<div className="bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center space-x-4">
							<div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
							<div>
								<div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2"></div>
								<div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
							</div>
						</div>
						<div className="h-12 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
					</div>
				</div>
			</div>

			{/* Loading Stats */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{Array.from({ length: 4 }, (_, index) => (
					<Card key={index} className="border-0 shadow-lg">
						<CardBody className="p-6">
							<div className="flex items-center justify-between">
								<div className="flex-1">
									<div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-2"></div>
									<div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-2"></div>
									<div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse"></div>
								</div>
								<div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
							</div>
						</CardBody>
					</Card>
				))}
			</div>
		</div>
	);
}
