import { auth } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import {
	FiUsers,
	FiChevronLeft,
	FiChevronRight
} from 'react-icons/fi';
import { UsersToolbar } from './users-toolbar';
import { searchPublicProfiles, getFollowingSubset } from '@/lib/db/queries';
import { ProfileRow, ProfileCard } from '@/components/profile';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;
type View = 'list' | 'grid';

function parsePage(input: string | string[] | undefined): number {
	const v = Array.isArray(input) ? input[0] : input;
	const n = Number.parseInt(v ?? '1', 10);
	return !Number.isFinite(n) || n < 1 ? 1 : n;
}

function parseView(input: string | string[] | undefined): View {
	const v = Array.isArray(input) ? input[0] : input;
	// Default is grid (gallery of cards, mirroring the /following layout).
	// Pass `?view=list` to switch to the dense row layout.
	return v === 'list' ? 'list' : 'grid';
}

/**
 * Page numbers to show around the current page. We render first, last, current
 * ± 1, and ellipses for the gaps. Keeps the control to ~7 buttons at any size.
 */
function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: (number | 'ellipsis')[] = [1];
	const left = Math.max(2, current - 1);
	const right = Math.min(total - 1, current + 1);
	if (left > 2) pages.push('ellipsis');
	for (let i = left; i <= right; i++) pages.push(i);
	if (right < total - 1) pages.push('ellipsis');
	pages.push(total);
	return pages;
}

export default async function UsersDirectoryPage({
	searchParams
}: {
	searchParams: Promise<{ q?: string | string[]; page?: string | string[]; view?: string | string[] }>;
}) {
	const params = await searchParams;
	const t = await getTranslations('usersDirectory');
	const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
	const query = rawQuery?.trim() ?? '';
	const page = parsePage(params.page);
	const view = parseView(params.view);

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;

	const { rows, total, totalPages } = await searchPublicProfiles({
		query,
		page,
		limit: PAGE_SIZE
	});

	const followingSet = viewerUserId
		? await getFollowingSubset(
				viewerUserId,
				rows.map((r) => r.userId)
			)
		: new Set<string>();

	const buildHref = (overrides: Record<string, string | number | undefined>) => ({
		pathname: '/client/users',
		query: {
			...(query ? { q: query } : {}),
			// Grid is the default — only persist the URL param when it's `list`.
			...(view === 'list' ? { view: 'list' } : {}),
			...(page > 1 ? { page } : {}),
			...overrides
		}
	});

	const pages = pageWindow(page, totalPages);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-6 sm:py-8 space-y-6">

					{/* Page header — matches submissions flat header pattern */}
					<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-theme-primary-100 dark:bg-theme-primary-900/40">
								<FiUsers className="h-5 w-5 text-theme-primary-600 dark:text-theme-primary-400" aria-hidden="true" />
							</div>
							<div className="min-w-0">
								<h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl">
									{query ? t('RESULTS_FOR', { query }) : t('HERO_SUBTITLE')}
								</h1>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
									{t('PROFILES_COUNT', { count: total })}
								</p>
							</div>
						</div>
					</header>

					{/* Sticky toolbar — client component so search navigates without a hard reload */}
					<UsersToolbar query={query} view={view} />

					{/* Results */}
					{rows.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/10 bg-white dark:bg-[#111111] py-20 px-6 text-center">
							<div className="mx-auto w-14 h-14 rounded-2xl bg-theme-primary-50 dark:bg-theme-primary-900/30 flex items-center justify-center">
								<FiUsers className="w-6 h-6 text-theme-primary-500 dark:text-theme-primary-400" aria-hidden="true" />
							</div>
							<h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
								{query ? t('EMPTY_TITLE_QUERY') : t('EMPTY_TITLE_DEFAULT')}
							</h2>
							<p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed sm:text-sm">
								{query ? t('EMPTY_DESC_QUERY') : t('EMPTY_DESC_DEFAULT')}
							</p>
							{query && (
								<div className="mt-5">
									<Link
										href="/client/users"
										className={cn(
											'inline-flex py-2 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold shadow-sm',
											'bg-theme-primary-600 text-white hover:bg-theme-primary-700',
											'dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
											'transition-colors',
											'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
										)}
									>
										<FiUsers className="h-3.5 w-3.5" aria-hidden="true" />
										{t('EMPTY_CTA_BROWSE_ALL')}
									</Link>
								</div>
							)}
						</div>
					) : view === 'grid' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{rows.map((row) => {
								const isViewer = !!viewerUserId && viewerUserId === row.userId;
								return (
									<ProfileCard
										key={row.userId}
										username={row.username ?? row.userId}
										displayName={row.displayName || row.name}
										jobTitle={row.jobTitle}
										bio={row.bio}
										avatar={row.avatar}
										location={row.location}
										isViewer={isViewer}
										follow={
											isViewer
												? undefined
												: {
														isAuthenticated: !!viewerUserId,
														initialIsFollowing: followingSet.has(row.userId)
													}
										}
									/>
								);
							})}
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
							{rows.map((row) => {
								const isViewer = !!viewerUserId && viewerUserId === row.userId;
								return (
									<ProfileRow
										key={row.userId}
										username={row.username ?? row.userId}
										displayName={row.displayName || row.name}
										jobTitle={row.jobTitle}
										bio={row.bio}
										avatar={row.avatar}
										location={row.location}
										isViewer={isViewer}
										follow={
											isViewer
												? undefined
												: {
														isAuthenticated: !!viewerUserId,
														initialIsFollowing: followingSet.has(row.userId)
													}
										}
									/>
								);
							})}
						</div>
					)}

					{/* Numbered pagination — server-rendered, no JS needed */}
					{totalPages > 1 && (
						<nav aria-label="Pagination" className="flex flex-col items-center gap-4 pt-2">
							<p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
								{t('PAGINATION_PAGE_OF', { current: page, total: totalPages })}
							</p>
							<div className="flex items-center gap-2">
								{/* Previous */}
								{page > 1 ? (
									<Link
										href={buildHref({ page: page > 1 ? page - 1 : undefined })}
										className={cn(
											'inline-flex py-2 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium',
											'border-gray-200 bg-white text-gray-700',
											'hover:bg-gray-50 hover:text-gray-900',
											'dark:border-white/8 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/8 dark:hover:text-gray-100',
											'transition-colors duration-150',
											'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
										)}
										aria-label={t('PAGINATION_PREV')}
									>
										<FiChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
										{t('PAGINATION_PREV')}
									</Link>
								) : (
									<span
										aria-disabled
										className="inline-flex py-2 items-center gap-1.5 rounded-lg border border-transparent px-3 text-xs font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed select-none"
									>
										<FiChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
										{t('PAGINATION_PREV')}
									</span>
								)}

								{/* Page numbers */}
								<div className="inline-flex items-center gap-1">
									{pages.map((p, idx) =>
										p === 'ellipsis' ? (
											<span
												key={`e${idx}`}
												className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 dark:text-gray-600 select-none"
											>
												…
											</span>
										) : (
											<Link
												key={p}
												href={buildHref({ page: p === 1 ? undefined : p })}
												aria-current={p === page ? 'page' : undefined}
												className={cn(
													'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150',
													p === page
														? 'bg-theme-primary-600 text-white shadow-sm'
														: 'text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'
												)}
											>
												{p}
											</Link>
										)
									)}
								</div>

								{/* Next */}
								{page < totalPages ? (
									<Link
										href={buildHref({ page: page < totalPages ? page + 1 : undefined })}
										className={cn(
											'inline-flex py-2 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium',
											'border-gray-200 bg-white text-gray-700',
											'hover:bg-gray-50 hover:text-gray-900',
											'dark:border-white/8 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/8 dark:hover:text-gray-100',
											'transition-colors duration-150',
											'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500/40'
										)}
										aria-label={t('PAGINATION_NEXT')}
									>
										{t('PAGINATION_NEXT')}
										<FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
									</Link>
								) : (
									<span
										aria-disabled
										className="inline-flex py-2 items-center gap-1.5 rounded-lg border border-transparent px-3 text-xs font-medium text-gray-300 dark:text-gray-600 cursor-not-allowed select-none"
									>
										{t('PAGINATION_NEXT')}
										<FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
									</span>
								)}
							</div>
						</nav>
					)}
				</div>
			</Container>
		</div>
	);
}
