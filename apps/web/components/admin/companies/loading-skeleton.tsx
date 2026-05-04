const CARD = 'bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl';
const PULSE = 'animate-pulse rounded-lg bg-gray-100 dark:bg-white/6';

export function LoadingSkeleton() {
	return (
		<div className="min-h-screen pb-20" aria-busy="true" aria-label="Loading companies…">
			{/* Page Header */}
			<div className="mb-8">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className={`w-11 h-11 rounded-xl ${PULSE} shrink-0`} />
						<div>
							<div className={`h-5 w-36 ${PULSE} mb-1.5`} />
							<div className={`h-3.5 w-48 ${PULSE}`} />
						</div>
					</div>
					<div className={`h-8 w-32 rounded-xl ${PULSE} shrink-0`} />
				</div>
				<div className="mt-5 h-px bg-gray-100 dark:bg-white/6" />
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{Array.from({ length: 3 }, (_, i) => (
					<div key={i} className={`${CARD} p-5 overflow-hidden relative`}>
						<div className={`absolute top-0 inset-x-0 h-0.5 ${PULSE} rounded-t-2xl rounded-b-none`} />
						<div className="flex items-start justify-between mb-4 pt-0.5">
							<div className={`h-3 w-24 ${PULSE}`} />
							<div className={`w-9 h-9 rounded-xl ${PULSE} shrink-0`} />
						</div>
						<div className={`h-7 w-16 ${PULSE} mb-3`} />
						<div className={`h-2.5 w-28 ${PULSE}`} />
					</div>
				))}
			</div>

			{/* Table Card */}
			<div className={`${CARD} overflow-hidden`}>
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/1.5">
					<div className="flex items-center justify-between">
						<div className={`h-4 w-24 ${PULSE}`} />
						<div className={`h-8 w-40 rounded-xl ${PULSE}`} />
					</div>
				</div>
				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{Array.from({ length: 5 }, (_, i) => (
						<div key={i} className="flex items-center gap-4 px-5 py-3.5">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<div className={`w-9 h-9 rounded-full ${PULSE} shrink-0`} />
								<div className="flex-1 min-w-0">
									<div className={`h-4 w-36 ${PULSE} mb-1.5`} />
									<div className={`h-3 w-48 ${PULSE}`} />
								</div>
							</div>
							<div className="flex items-center gap-3 shrink-0">
								<div className={`h-5 w-14 rounded-full ${PULSE}`} />
								<div className={`h-3 w-20 ${PULSE} hidden sm:block`} />
								<div className="flex items-center gap-1">
									<div className={`w-8 h-8 rounded-lg ${PULSE}`} />
									<div className={`w-8 h-8 rounded-lg ${PULSE}`} />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
