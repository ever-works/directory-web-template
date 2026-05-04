const CARD = 'bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl';
const PULSE = 'animate-pulse rounded-lg bg-gray-100 dark:bg-white/6';

export function LoadingSkeleton() {
	return (
		<div className="min-h-screen pb-20" aria-busy="true" aria-label="Loading clients…">

			{/* Page Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						{/* Gradient icon placeholder */}
						<div className={`w-11 h-11 rounded-xl ${PULSE} shrink-0`} />
						<div>
							<div className={`h-5 w-36 ${PULSE} mb-1.5`} />
							<div className={`h-3.5 w-48 ${PULSE}`} />
						</div>
					</div>
					<div className={`h-8 w-28 rounded-xl ${PULSE} shrink-0`} />
				</div>
				{/* Gradient divider */}
				<div className="mt-5 h-px bg-gray-100 dark:bg-white/6" />
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }, (_, i) => (
					<div key={i} className={`${CARD} p-5 overflow-hidden relative`}>
						{/* Accent stripe placeholder */}
						<div className={`absolute top-0 inset-x-0 h-0.5 ${PULSE} rounded-t-2xl rounded-b-none`} />
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<div className={`h-3 w-20 ${PULSE}`} />
							<div className={`w-9 h-9 rounded-xl ${PULSE} shrink-0`} />
						</div>
						<div className={`h-7 w-20 ${PULSE} mb-3`} />
						<div className={`h-2.5 w-28 ${PULSE}`} />
					</div>
				))}
			</div>

			{/* Search Bar */}
			<div className={`h-11 w-full rounded-xl ${PULSE} mb-6`} />

			{/* Table Card */}
			<div className={`${CARD} overflow-hidden`}>
				{/* Table Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className={`h-4 w-24 ${PULSE}`} />
							<div className={`h-5 w-8 rounded-md ${PULSE}`} />
						</div>
						<div className={`h-8 w-40 rounded-xl ${PULSE}`} />
					</div>
				</div>

				{/* Column Headers */}
				<div className="hidden md:flex items-center gap-4 px-5 py-2.5 border-b border-gray-100 dark:border-white/5">
					{[8, 40, 14, 14, 18].map((w, i) => (
						<div key={i} className={`h-2.5 rounded ${PULSE}`} style={{ width: `${w}%` }} />
					))}
				</div>

				{/* Rows */}
				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{Array.from({ length: 7 }, (_, i) => (
						<div key={i} className="flex items-center gap-4 px-5 py-3.5">
							<div className={`hidden md:block w-8 h-3.5 ${PULSE} rounded`} />
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<div className={`w-9 h-9 rounded-full ${PULSE} shrink-0`} />
								<div className="flex-1 min-w-0">
									<div className={`h-4 w-36 ${PULSE} mb-1.5`} />
									<div className={`h-3 w-48 ${PULSE}`} />
								</div>
							</div>
							<div className="hidden md:flex items-center gap-2.5">
								<div className={`h-5 w-16 rounded-full ${PULSE}`} />
								<div className={`h-5 w-14 rounded-full ${PULSE}`} />
								<div className={`h-5 w-20 rounded-full ${PULSE}`} />
							</div>
							<div className="flex items-center gap-1 ml-auto">
								{Array.from({ length: 3 }, (_, j) => (
									<div key={j} className={`w-8 h-8 rounded-lg ${PULSE}`} />
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
