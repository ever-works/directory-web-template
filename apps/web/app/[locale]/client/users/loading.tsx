import { Container } from '@/components/ui/container';

/**
 * Shown by Next.js while the server component above streams. Mirrors the
 * shape of the real page (hero, toolbar, card grid) so the layout doesn't
 * jump when content arrives.
 */
export default function UsersDirectoryLoading() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-white dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0c0c0c]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 sm:py-10 space-y-6">
					{/* Hero skeleton */}
					<div className="rounded-3xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] px-6 sm:px-8 py-7 sm:py-9">
						<div className="h-5 w-24 rounded-full bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
						<div className="mt-3 h-8 w-72 max-w-full rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
						<div className="mt-2 h-4 w-32 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
					</div>

					{/* Toolbar skeleton */}
					<div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] p-3 flex flex-col sm:flex-row gap-3">
						<div className="flex-1 h-11 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
						<div className="h-11 w-32 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
					</div>

					{/* Card grid skeleton — mirrors ProfileCard's banner + overlapping avatar layout */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="flex flex-col rounded-2xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-white/[0.03] overflow-hidden shadow-sm"
							>
								<div className="h-16 w-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-white/[0.06] dark:to-white/[0.03] animate-pulse" />
								<div className="flex justify-center -mt-8 px-4">
									<div className="w-16 h-16 rounded-full ring-4 ring-white dark:ring-neutral-950 bg-gray-200 dark:bg-white/[0.08] animate-pulse" />
								</div>
								<div className="px-4 pt-3 pb-4 flex flex-col items-center gap-2">
									<div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
									<div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
									<div className="h-3 w-40 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse mt-1" />
									<div className="h-3 w-36 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
								</div>
								<div className="px-4 pb-4 flex items-center gap-2">
									<div className="flex-1 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
									<div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
								</div>
							</div>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
