import { PageContainer } from '@/components/ui/container';

/**
 * Loading state for a single post (EW-27).
 *
 * Without this file the `/blog` listing skeleton would serve as the Suspense
 * fallback for this segment too, and opening a post would flash a card grid
 * before shifting to an article layout. This mirrors the real post instead:
 * breadcrumb, header block, hero image, then prose lines.
 */
export default function BlogPostLoading() {
	return (
		<PageContainer className="py-8 sm:py-12 md:py-16">
			<div aria-busy="true" aria-live="polite">
				<div className="mb-6 h-4 w-56 max-w-full animate-pulse rounded bg-gray-200/60 dark:bg-white/6" />

				<div className="mx-auto max-w-3xl">
					<div className="mb-4 flex gap-2">
						<div className="h-5 w-24 animate-pulse rounded-full bg-gray-200/60 dark:bg-white/6" />
						<div className="h-5 w-20 animate-pulse rounded-full bg-gray-200/40 dark:bg-white/4" />
					</div>

					<div className="mb-4 space-y-3">
						<div className="h-8 w-full animate-pulse rounded bg-gray-200/70 dark:bg-white/6" />
						<div className="h-8 w-2/3 animate-pulse rounded bg-gray-200/70 dark:bg-white/6" />
					</div>

					<div className="mb-6 flex flex-wrap gap-4">
						<div className="h-4 w-32 animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
						<div className="h-4 w-28 animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
						<div className="h-4 w-24 animate-pulse rounded bg-gray-200/50 dark:bg-white/4" />
					</div>

					<div className="mb-10 aspect-16/9 w-full animate-pulse rounded-lg bg-gray-200/70 dark:bg-white/6" />

					<div className="space-y-4">
						{[
							'w-full',
							'w-full',
							'w-11/12',
							'w-full',
							'w-4/5',
							'w-full',
							'w-full',
							'w-3/4',
							'w-full',
							'w-2/3'
						].map((width, index) => (
							<div
								key={index}
								className={`h-4 ${width} animate-pulse rounded bg-gray-200/50 dark:bg-white/4`}
							/>
						))}
					</div>
				</div>
			</div>
		</PageContainer>
	);
}
