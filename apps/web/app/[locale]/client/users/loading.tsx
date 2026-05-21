import { Container } from '@/components/ui/container';

/**
 * Shown by Next.js while the server component above streams. Mirrors the
 * shape of the real page (header, toolbar, card grid) so the layout doesn't
 * jump when content arrives.
 */
export default function UsersDirectoryLoading() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-6 sm:py-8 space-y-6">
					{/* Header skeleton — flat layout matching submissions */}
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 shrink-0 rounded-xl bg-gray-200 dark:bg-white/6 animate-pulse" />
						<div>
							<div className="h-5 w-56 max-w-full rounded bg-gray-200 dark:bg-white/6 animate-pulse" />
							<div className="mt-1.5 h-3.5 w-24 rounded bg-gray-100 dark:bg-white/4 animate-pulse" />
						</div>
					</div>

					{/* Toolbar skeleton */}
					<div className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] p-2 sm:p-3 flex items-center gap-2">
						<div className="flex-1 h-9 rounded-lg bg-gray-100 dark:bg-white/4 animate-pulse" />
						<div className="hidden sm:block h-9 w-20 rounded-lg bg-gray-100 dark:bg-white/4 animate-pulse" />
						<div className="h-9 w-[74px] rounded-lg bg-gray-100 dark:bg-white/4 animate-pulse" />
					</div>

					{/* Card grid skeleton — mirrors ProfileCard's h-20 banner + 72px overlapping avatar */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="flex flex-col rounded-2xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/3 overflow-hidden shadow-sm"
							>
								{/* Banner */}
								<div className="h-20 w-full bg-linear-to-br from-gray-200 to-gray-100 dark:from-white/6 dark:to-white/3 animate-pulse" />
								{/* Avatar overlap */}
								<div className="flex justify-center -mt-9 px-4">
									<div className="w-18 h-18 rounded-full ring-4 ring-white dark:ring-neutral-950 bg-gray-200 dark:bg-white/8 animate-pulse" />
								</div>
								{/* Content lines */}
								<div className="px-4 pt-2.5 pb-4 flex flex-col items-center gap-2">
									<div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/6 animate-pulse" />
									<div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/4 animate-pulse" />
									<div className="h-3 w-36 rounded bg-gray-100 dark:bg-white/4 animate-pulse mt-0.5" />
									<div className="h-3 w-24 rounded bg-gray-100 dark:bg-white/4 animate-pulse" />
									<div className="h-3 w-40 rounded bg-gray-100 dark:bg-white/4 animate-pulse" />
								</div>
								{/* Action row */}
								<div className="px-4 pb-4 flex items-center gap-2">
									<div className="flex-1 h-8 rounded-xl bg-gray-100 dark:bg-white/4 animate-pulse" />
									<div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/4 animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
