import { Card, CardBody } from '@heroui/react';

export function LoadingSkeleton() {
	return (
		<div className="p-6 max-w-7xl mx-auto min-h-screen pb-20" aria-busy="true" aria-label="Loading clients…">
			{/* Page Header */}
			<div className="mb-8 flex items-start justify-between gap-4">
				<div>
					<div className="h-7 w-36 bg-gray-200 dark:bg-white/8 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-56 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
				</div>
				<div className="h-9 w-32 bg-gray-200 dark:bg-white/8 rounded-xl animate-pulse shrink-0" />
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }, (_, i) => (
					<Card key={i} className="border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl bg-white dark:bg-white/[0.03]">
						<CardBody className="p-6">
							<div className="flex items-start justify-between mb-3">
								<div className="h-3 w-20 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
								<div className="w-9 h-9 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse shrink-0" />
							</div>
							<div className="h-8 w-16 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-3" />
							<div className="h-3 w-24 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
						</CardBody>
					</Card>
				))}
			</div>

			{/* Search Bar */}
			<div className="h-11 w-full bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse mb-6" />

			{/* Table Card */}
			<Card className="border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl bg-white dark:bg-white/[0.03] overflow-hidden">
				<CardBody className="p-0">
					{/* Table Header */}
					<div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.015]">
						<div className="flex items-center justify-between">
							<div className="h-5 w-28 bg-gray-200 dark:bg-white/8 rounded animate-pulse" />
							<div className="h-8 w-36 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
						</div>
					</div>

					{/* Column Headers */}
					<div className="hidden md:flex items-center gap-4 px-6 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
						{[10, 44, 16, 16, 20].map((w, i) => (
							<div key={i} className={`h-3 bg-gray-200 dark:bg-white/8 rounded animate-pulse`} style={{ width: `${w}%` }} />
						))}
					</div>

					{/* Rows */}
					<div className="divide-y divide-gray-100/50 dark:divide-white/[0.03]">
						{Array.from({ length: 8 }, (_, i) => (
							<div key={i} className="flex items-center gap-4 px-6 py-4">
								<div className="w-10 h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse hidden md:block" />
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/8 animate-pulse shrink-0" />
									<div className="flex-1 min-w-0">
										<div className="h-4 w-32 bg-gray-200 dark:bg-white/8 rounded animate-pulse mb-1.5" />
										<div className="h-3 w-44 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
									</div>
								</div>
								<div className="hidden md:flex gap-2">
									<div className="h-6 w-16 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
									<div className="h-6 w-14 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
									<div className="h-6 w-20 bg-gray-100 dark:bg-white/5 rounded-full animate-pulse" />
								</div>
								<div className="flex gap-1 ml-auto">
									{Array.from({ length: 3 }, (_, j) => (
										<div key={j} className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
									))}
								</div>
							</div>
						))}
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
