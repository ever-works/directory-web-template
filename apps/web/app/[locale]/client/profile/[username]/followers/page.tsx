import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiUserPlus } from 'react-icons/fi';
import {
	getClientProfileByUsername,
	getFollowerCount,
	getFollowingSubset,
	isUserAccountDeactivated,
	listFollowers
} from '@/lib/db/queries';
import { FOLLOW_LIST_PAGE_SIZE, parsePageParam } from '../_follow-list-shared';
import { FollowPersonCard } from '../_follow-person-card';

export const dynamic = 'force-dynamic';

export default async function ProfileFollowersPage({
	params,
	searchParams
}: {
	params: Promise<{ username: string }>;
	searchParams: Promise<{ page?: string | string[] }>;
}) {
	const { username } = await params;
	const { page: rawPage } = await searchParams;
	const page = parsePageParam(rawPage);

	const profile = await getClientProfileByUsername(username);
	if (!profile) notFound();

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;

	// Hide a deactivated owner's follow lists from everyone except the owner.
	if (viewerUserId !== profile.userId && (await isUserAccountDeactivated(profile.userId))) {
		notFound();
	}

	const [total, followers] = await Promise.all([
		getFollowerCount(profile.userId),
		listFollowers(profile.userId, FOLLOW_LIST_PAGE_SIZE, (page - 1) * FOLLOW_LIST_PAGE_SIZE)
	]);

	const followingSet = viewerUserId
		? await getFollowingSubset(
				viewerUserId,
				followers.map((f) => f.userId)
			)
		: new Set<string>();

	const totalPages = Math.max(1, Math.ceil(total / FOLLOW_LIST_PAGE_SIZE));
	const displayName = profile.displayName || profile.name || profile.username || 'this user';
	const t = await getTranslations('profile');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Back link */}
					<Link
						href={`/client/profile/${username}`}
						className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors duration-150"
					>
						<FiArrowLeft className="w-3.5 h-3.5" />
						{t('BACK_TO_PROFILE')}
					</Link>

					{/* Page header */}
					<div className="flex items-end justify-between gap-4 flex-wrap">
						<div>
							<h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
								{t('FOLLOWERS_PAGE_TITLE', { name: displayName })}
							</h1>
							<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
								{total.toLocaleString()} {t(total === 1 ? 'FOLLOWER_SINGULAR' : 'FOLLOWER_PLURAL')}
							</p>
						</div>
						{totalPages > 1 && (
							<span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-lg px-3 py-1.5">
								{t('PAGINATION_PAGE_OF', { current: page, total: totalPages })}
							</span>
						)}
					</div>

					{/* Grid / empty state */}
					{followers.length === 0 ? (
						<div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl shadow-sm p-16 text-center">
							<span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-4 mx-auto">
								<FiUserPlus className="w-7 h-7" />
							</span>
							<p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
								{t('NO_FOLLOWERS_TITLE')}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-xs mx-auto">
								{t('NO_FOLLOWERS_DESC', { name: displayName })}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{followers.map((row) => {
								const isViewer = !!viewerUserId && viewerUserId === row.userId;
								return (
									<FollowPersonCard
										key={row.userId}
										row={row}
										isViewer={isViewer}
										isAuthenticated={!!viewerUserId}
										initialIsFollowing={followingSet.has(row.userId)}
										selfRowMode="hide-action"
										t={t}
									/>
								);
							})}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-3 pt-2">
							<Link
								href={{
									pathname: `/client/profile/${username}/followers`,
									query: page > 2 ? { page: page - 1 } : undefined
								}}
								aria-disabled={page <= 1}
								className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
									page > 1
										? 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/5 bg-white/60 dark:bg-white/[0.02]'
										: 'border-transparent text-neutral-300 dark:text-neutral-600 pointer-events-none'
								}`}
							>
								<FiChevronLeft className="w-4 h-4" />
								{t('PAGINATION_PREVIOUS')}
							</Link>

							{/* Page dots */}
							<div className="flex items-center gap-1.5">
								{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
									const p =
										totalPages <= 7
											? i + 1
											: i === 0
												? 1
												: i === 6
													? totalPages
													: page <= 4
														? i + 1
														: page >= totalPages - 3
															? totalPages - 6 + i
															: page - 3 + i;
									const isActive = p === page;
									return (
										<Link
											key={i}
											href={{
												pathname: `/client/profile/${username}/followers`,
												query: p > 1 ? { page: p } : undefined
											}}
											className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all duration-150 ${
												isActive
													? 'bg-theme-primary-600 text-white shadow-sm'
													: 'text-neutral-500 dark:text-neutral-400 hover:bg-white dark:hover:bg-white/5 hover:text-neutral-800 dark:hover:text-neutral-200'
											}`}
										>
											{p}
										</Link>
									);
								})}
							</div>

							<Link
								href={{
									pathname: `/client/profile/${username}/followers`,
									query: { page: page + 1 }
								}}
								aria-disabled={page >= totalPages}
								className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
									page < totalPages
										? 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-white/5 bg-white/60 dark:bg-white/[0.02]'
										: 'border-transparent text-neutral-300 dark:text-neutral-600 pointer-events-none'
								}`}
							>
								{t('PAGINATION_NEXT')}
								<FiChevronRight className="w-4 h-4" />
							</Link>
						</div>
					)}
				</div>
			</Container>
		</div>
	);
}
