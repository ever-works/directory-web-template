import { Container } from '@/components/ui/container';

/**
 * Shown by Next.js while the server component above streams. Mirrors the
 * shape of the real page (hero, toolbar, list rows) so layout doesn't jump
 * when content arrives.
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

					{/* Rows skeleton */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="flex items-start gap-4 p-5 rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111]"
							>
								<div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-white/[0.06] animate-pulse shrink-0" />
								<div className="flex-1 min-w-0 space-y-2">
									<div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-white/[0.06] animate-pulse" />
									<div className="h-3 w-1/4 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
									<div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
								</div>
								<div className="h-8 w-20 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse shrink-0" />
							</div>
						))}
					</div>
				</div>
			</Container>
		</div>
	);
}
