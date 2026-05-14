import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import {
	FiArrowLeft,
	FiChevronLeft,
	FiChevronRight,
	FiUser,
	FiUserCheck,
} from 'react-icons/fi';
import {
	getClientProfileByUsername,
	getFollowingCount,
	getFollowingSubset,
	listFollowing,
} from '@/lib/db/queries';
import { FollowButton } from '@/components/profile/follow-button';
import { FOLLOW_LIST_PAGE_SIZE, parsePageParam } from '../_follow-list-shared';
import type { FollowListRow } from '@/lib/db/queries/follows.queries';

export const dynamic = 'force-dynamic';

// ─── Card ─────────────────────────────────────────────────────────────────────

function FollowPersonCard({
	row,
	isViewer,
	isAuthenticated,
	initialIsFollowing,
	t,
}: {
	row: FollowListRow;
	isViewer: boolean;
	isAuthenticated: boolean;
	initialIsFollowing: boolean;
	// next-intl getTranslations return type is not exported; using unknown avoids an import
	t: (key: string) => string;
}) {
	const handle = row.username ?? row.userId;
	const displayName = row.displayName || row.name;

	return (
		<div className="group flex flex-col bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-white/14 transition-all duration-200">
			{/* Gradient banner */}
			<div
				className="h-16 w-full shrink-0"
				style={{
					background:
						'linear-gradient(135deg, var(--theme-primary, #6366f1) 0%, var(--theme-secondary, #a5b4fc) 100%)',
				}}
			/>

			{/* Avatar — overlaps the banner */}
			<div className="flex justify-center -mt-8 px-4">
				<div className="relative w-16 h-16 rounded-full ring-4 ring-white dark:ring-neutral-950 overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow">
					{row.avatar ? (
						<Image
							src={row.avatar}
							alt={displayName}
							fill
							sizes="64px"
							className="object-cover"
							unoptimized
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<FiUser className="w-7 h-7 text-neutral-400" />
						</div>
					)}
				</div>
			</div>

			{/* Identity */}
			<div className="flex-1 flex flex-col items-center px-4 pt-3 pb-4 text-center gap-1 min-w-0">
				<Link
					href={`/client/profile/${handle}`}
					className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 truncate w-full hover:text-theme-primary-600 dark:hover:text-theme-primary-400 transition-colors leading-tight"
				>
					{displayName}
				</Link>
				<p className="text-xs text-neutral-400 dark:text-neutral-500 truncate w-full">
					@{handle}
				</p>

				{row.jobTitle && (
					<p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 truncate w-full mt-0.5">
						{row.jobTitle}
					</p>
				)}

				{row.bio && (
					<p className="text-[11.5px] leading-relaxed text-neutral-400 dark:text-neutral-500 line-clamp-2 mt-1 w-full">
						{row.bio}
					</p>
				)}
			</div>

			{/* Actions */}
			<div className="px-4 pb-4 flex items-center gap-2">
				{isViewer ? (
					<span className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-white/8 bg-transparent select-none cursor-default">
						<FiUserCheck className="w-3.5 h-3.5" />
						{t('FOLLOWING')}
					</span>
				) : (
					<div className="flex-1">
						<FollowButton
							username={handle}
							initialIsFollowing={initialIsFollowing}
							isAuthenticated={isAuthenticated}
						/>
					</div>
				)}
				<Link
					href={`/client/profile/${handle}`}
					className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-200 dark:border-white/8 bg-transparent text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 hover:border-neutral-300 dark:hover:border-white/15 transition-all duration-150"
					title={`View ${displayName}'s profile`}
				>
					<FiUser className="w-3.5 h-3.5" />
				</Link>
			</div>
		</div>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfileFollowingPage({
	params,
	searchParams,
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

	const [total, following] = await Promise.all([
		getFollowingCount(profile.userId),
		listFollowing(profile.userId, FOLLOW_LIST_PAGE_SIZE, (page - 1) * FOLLOW_LIST_PAGE_SIZE),
	]);

	const followingSet = viewerUserId
		? await getFollowingSubset(
				viewerUserId,
				following.map((f) => f.userId)
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
								{t('FOLLOWING_PAGE_TITLE', { name: displayName })}
							</h1>
							<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
								{total.toLocaleString()}{' '}
								{t(total === 1 ? 'PROFILE_SINGULAR' : 'PROFILE_PLURAL')}
							</p>
						</div>
						{totalPages > 1 && (
							<span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-lg px-3 py-1.5">
								{t('PAGINATION_PAGE_OF', { current: page, total: totalPages })}
							</span>
						)}
					</div>

					{/* Grid / empty state */}
					{following.length === 0 ? (
						<div className="bg-white dark:bg-white/[0.03] border border-neutral-200 dark:border-white/8 rounded-2xl shadow-sm p-16 text-center">
							<span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-4 mx-auto">
								<FiUserCheck className="w-7 h-7" />
							</span>
							<p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
								{t('NO_FOLLOWING_TITLE')}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-xs mx-auto">
								{t('NO_FOLLOWING_DESC', { name: displayName })}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{following.map((row) => {
								const isViewer =
									!!viewerUserId && viewerUserId === row.userId;
								return (
									<FollowPersonCard
										key={row.userId}
										row={row}
										isViewer={isViewer}
										isAuthenticated={!!viewerUserId}
										initialIsFollowing={followingSet.has(row.userId)}
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
									pathname: `/client/profile/${username}/following`,
									query: page > 2 ? { page: page - 1 } : undefined,
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
									const p = totalPages <= 7
										? i + 1
										: i === 0 ? 1
										: i === 6 ? totalPages
										: page <= 4 ? i + 1
										: page >= totalPages - 3 ? totalPages - 6 + i
										: page - 3 + i;
									const isActive = p === page;
									return (
										<Link
											key={i}
											href={{
												pathname: `/client/profile/${username}/following`,
												query: p > 1 ? { page: p } : undefined,
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
									pathname: `/client/profile/${username}/following`,
									query: { page: page + 1 },
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
