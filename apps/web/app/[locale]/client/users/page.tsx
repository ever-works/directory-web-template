import { auth } from '@/lib/auth';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import {
	FiSearch,
	FiUsers,
	FiX,
	FiList,
	FiGrid,
	FiChevronLeft,
	FiChevronRight
} from 'react-icons/fi';
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
	return v === 'grid' ? 'grid' : 'list';
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
			...(view === 'grid' ? { view: 'grid' } : {}),
			...(page > 1 ? { page } : {}),
			...overrides
		}
	});

	const pages = pageWindow(page, totalPages);

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 via-gray-50 to-white dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#0c0c0c]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 sm:py-10 space-y-6">
					{/* Hero */}
					<header className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] px-6 sm:px-8 py-7 sm:py-9">
						<div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-theme-primary-50/60 via-transparent to-transparent dark:from-theme-primary-900/20" />
						<div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
							<div>
								<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-theme-primary-50 dark:bg-theme-primary-900/30 text-theme-primary-700 dark:text-theme-primary-300 text-[11px] font-semibold uppercase tracking-wide">
									<FiUsers className="w-3.5 h-3.5" aria-hidden="true" />
									{t('HERO_TITLE')}
								</div>
								<h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
									{query ? t('RESULTS_FOR', { query }) : t('HERO_SUBTITLE')}
								</h1>
								<p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
									{t('PROFILES_COUNT', { count: total })}
								</p>
							</div>
						</div>
					</header>

					{/* Sticky toolbar — keeps search + view toggle in reach while scrolling */}
					<div className="sticky top-2 z-20 -mx-1 sm:mx-0">
						<div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white/85 dark:bg-[#111111]/85 backdrop-blur supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:dark:bg-[#111111]/65 shadow-sm">
							<div className="flex flex-col sm:flex-row gap-3 p-3 sm:p-3">
								{/* Search form — GET so the URL stays the source of truth */}
								<form method="GET" className="flex flex-1 gap-2 min-w-0">
									{/* Preserve view across searches */}
									{view === 'grid' && <input type="hidden" name="view" value="grid" />}
									<div className="relative flex-1 min-w-0">
										<FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
										<input
											type="search"
											name="q"
											defaultValue={query}
											placeholder={t('SEARCH_PLACEHOLDER')}
											autoComplete="off"
											className="w-full h-11 pl-10 pr-10 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/8 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-theme-primary-500/40 focus:border-theme-primary-500 transition-shadow"
										/>
										{query && (
											<Link
												href={buildHref({ q: undefined, page: undefined })}
												className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
												aria-label={t('CLEAR_SEARCH')}
											>
												<FiX className="w-3.5 h-3.5" />
											</Link>
										)}
									</div>
									<button
										type="submit"
										className="hidden sm:inline-flex items-center justify-center px-5 h-11 rounded-xl bg-theme-primary-600 hover:bg-theme-primary-700 text-white font-medium text-sm shadow-sm hover:shadow transition-all"
									>
										{t('SEARCH_BUTTON')}
									</button>
								</form>

								{/* View toggle — list / grid, persisted via URL */}
								<div
									role="group"
									aria-label={t('VIEW_TOGGLE_LABEL')}
									className="inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/8 self-stretch sm:self-auto"
								>
									<Link
										href={buildHref({ view: undefined, page: undefined })}
										aria-current={view === 'list' ? 'page' : undefined}
										className={cn(
											'inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-all',
											view === 'list'
												? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
												: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
										)}
									>
										<FiList className="w-3.5 h-3.5" aria-hidden="true" />
										<span className="hidden xs:inline sm:inline">{t('VIEW_LIST')}</span>
									</Link>
									<Link
										href={buildHref({ view: 'grid', page: undefined })}
										aria-current={view === 'grid' ? 'page' : undefined}
										className={cn(
											'inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium transition-all',
											view === 'grid'
												? 'bg-white dark:bg-white/10 text-gray-900 dark:text-gray-100 shadow-sm'
												: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
										)}
									>
										<FiGrid className="w-3.5 h-3.5" aria-hidden="true" />
										<span className="hidden xs:inline sm:inline">{t('VIEW_GRID')}</span>
									</Link>
								</div>
							</div>
						</div>
					</div>

					{/* Results */}
					{rows.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-gray-300 dark:border-white/10 bg-white dark:bg-[#111111] py-16 px-6 text-center">
							<div className="mx-auto w-14 h-14 rounded-2xl bg-theme-primary-50 dark:bg-theme-primary-900/30 flex items-center justify-center">
								<FiUsers className="w-6 h-6 text-theme-primary-500" aria-hidden="true" />
							</div>
							<h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
								{query ? t('EMPTY_TITLE_QUERY') : t('EMPTY_TITLE_DEFAULT')}
							</h2>
							<p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
								{query ? t('EMPTY_DESC_QUERY') : t('EMPTY_DESC_DEFAULT')}
							</p>
							{query && (
								<div className="mt-5">
									<Link
										href="/client/users"
										className="inline-flex items-center gap-1.5 px-4 h-9 text-xs font-medium rounded-lg bg-theme-primary-600 hover:bg-theme-primary-700 text-white transition-colors"
									>
										<FiUsers className="w-3.5 h-3.5" aria-hidden="true" />
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
						<nav
							aria-label="Pagination"
							className="flex flex-col items-center gap-3 pt-2"
						>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{t('PAGINATION_PAGE_OF', { current: page, total: totalPages })}
							</p>
							<div className="inline-flex items-center gap-1">
								<PaginationButton
									href={buildHref({ page: page > 1 ? page - 1 : undefined })}
									disabled={page <= 1}
									ariaLabel={t('PAGINATION_PREV')}
								>
									<FiChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
								</PaginationButton>
								{pages.map((p, idx) =>
									p === 'ellipsis' ? (
										<span
											key={`e${idx}`}
											className="inline-flex items-center justify-center w-8 h-8 text-xs text-gray-400 dark:text-gray-600 select-none"
										>
											…
										</span>
									) : (
										<PaginationButton
											key={p}
											href={buildHref({ page: p === 1 ? undefined : p })}
											isActive={p === page}
										>
											{p}
										</PaginationButton>
									)
								)}
								<PaginationButton
									href={buildHref({ page: page < totalPages ? page + 1 : undefined })}
									disabled={page >= totalPages}
									ariaLabel={t('PAGINATION_NEXT')}
								>
									<FiChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
								</PaginationButton>
							</div>
						</nav>
					)}
				</div>
			</Container>
		</div>
	);
}

function PaginationButton({
	href,
	children,
	isActive,
	disabled,
	ariaLabel
}: {
	href: React.ComponentProps<typeof Link>['href'];
	children: React.ReactNode;
	isActive?: boolean;
	disabled?: boolean;
	ariaLabel?: string;
}) {
	const base =
		'inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium border transition-colors';
	if (disabled) {
		return (
			<span
				aria-disabled
				aria-label={ariaLabel}
				className={cn(
					base,
					'border-gray-200 dark:border-white/8 text-gray-300 dark:text-gray-600 cursor-not-allowed'
				)}
			>
				{children}
			</span>
		);
	}
	return (
		<Link
			href={href}
			aria-current={isActive ? 'page' : undefined}
			aria-label={ariaLabel}
			className={cn(
				base,
				isActive
					? 'bg-theme-primary-600 border-theme-primary-600 text-white hover:bg-theme-primary-700 hover:border-theme-primary-700'
					: 'border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:border-gray-300 dark:hover:border-white/12'
			)}
		>
			{children}
		</Link>
	);
}
