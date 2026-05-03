const CARD = 'bg-white dark:bg-white/3 border border-gray-100 dark:border-white/6 rounded-2xl overflow-hidden';
const PULSE = 'animate-pulse rounded-lg bg-gray-100 dark:bg-white/6';

export function CollectionsSkeleton({ itemCount = 7 }: { itemCount?: number }) {
	return (
		<div className="min-h-screen pb-20" role="status" aria-live="polite" aria-busy="true">
			<span className="sr-only">Loading collections…</span>

			{/* Page Header */}
			<div className="mb-8" aria-hidden="true">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-4">
						<div className={`w-11 h-11 rounded-xl ${PULSE} shrink-0`} />
						<div>
							<div className={`h-5 w-40 ${PULSE} mb-1.5`} />
							<div className={`h-3.5 w-52 ${PULSE}`} />
						</div>
					</div>
					<div className={`h-8 w-36 rounded-xl ${PULSE} shrink-0`} />
				</div>
				<div className="mt-5 h-px bg-gray-100 dark:bg-white/6" />
			</div>

			{/* Collections Card */}
			<div className={CARD} aria-hidden="true">
				{/* Card Header */}
				<div className="px-5 py-3.5 border-b border-gray-100 dark:border-white/6 bg-gray-50/60 dark:bg-white/1.5 flex items-center justify-between">
					<div className={`h-4 w-32 ${PULSE}`} />
					<div className={`h-3.5 w-20 ${PULSE}`} />
				</div>

				{/* Collections List */}
				<div className="divide-y divide-gray-50 dark:divide-white/4">
					{Array.from({ length: itemCount }, (_, i) => (
						<div key={i} className="px-5 py-4">
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div className="flex items-start gap-4 flex-1 min-w-0">
									{/* Icon */}
									<div className={`w-10 h-10 rounded-xl ${PULSE} shrink-0`} />

									{/* Content */}
									<div className="flex-1 min-w-0 space-y-2">
										<div className="flex items-center gap-2 flex-wrap">
											<div className={`h-4 w-48 ${PULSE}`} />
											<div className={`h-5 w-16 rounded-full ${PULSE}`} />
											<div className={`h-5 w-20 rounded-full ${PULSE}`} />
										</div>
										<div className={`h-3 w-32 ${PULSE}`} />
										<div className="space-y-1.5">
											<div className={`h-3.5 w-full ${PULSE}`} />
											<div className={`h-3.5 w-5/6 ${PULSE}`} />
										</div>
									</div>
								</div>

								{/* Actions */}
								<div className="flex items-center gap-2">
									<div className={`h-8 w-28 rounded-xl ${PULSE}`} />
									<div className={`h-8 w-20 rounded-xl ${PULSE}`} />
									<div className={`h-8 w-20 rounded-xl ${PULSE}`} />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
