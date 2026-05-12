import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiUserCheck } from 'react-icons/fi';
import {
	getClientProfileByUsername,
	getFollowingCount,
	getFollowingSubset,
	listFollowing
} from '@/lib/db/queries';
import { ProfileRow } from '@/components/profile/profile-row';
import { FOLLOW_LIST_PAGE_SIZE, parsePageParam } from '../_follow-list-shared';

export const dynamic = 'force-dynamic';

export default async function ProfileFollowingPage({
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

	const [total, following] = await Promise.all([
		getFollowingCount(profile.userId),
		listFollowing(profile.userId, FOLLOW_LIST_PAGE_SIZE, (page - 1) * FOLLOW_LIST_PAGE_SIZE)
	]);

	const followingSet = viewerUserId
		? await getFollowingSubset(viewerUserId, following.map((f) => f.userId))
		: new Set<string>();

	const totalPages = Math.max(1, Math.ceil(total / FOLLOW_LIST_PAGE_SIZE));
	const displayName = profile.displayName || profile.name || profile.username || 'this user';
	const t = await getTranslations('profile');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="space-y-6 py-8">
					{/* Back link */}
					<Link
						href={`/client/profile/${username}`}
						className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors duration-150"
					>
						<FiArrowLeft className="w-3.5 h-3.5" />
						{t('BACK_TO_PROFILE')}
					</Link>

					{/* Header */}
					<div>
						<h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
							{t('FOLLOWING_PAGE_TITLE', { name: displayName })}
						</h1>
						<p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
							{total.toLocaleString()} {t(total === 1 ? 'PROFILE_SINGULAR' : 'PROFILE_PLURAL')}
						</p>
					</div>

					{following.length === 0 ? (
						<div className="bg-white dark:bg-white/3 border border-neutral-200 dark:border-white/8 rounded-xl shadow-sm p-12 text-center">
							<span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 dark:bg-white/8 text-neutral-400 mb-4">
								<FiUserCheck className="w-6 h-6" />
							</span>
							<p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('NO_FOLLOWING_TITLE')}</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
								{t('NO_FOLLOWING_DESC', { name: displayName })}
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{following.map((row) => {
								const isViewer = !!viewerUserId && viewerUserId === row.userId;
								return (
									<ProfileRow
										key={row.userId}
										username={row.username ?? row.userId}
										displayName={row.displayName || row.name}
										jobTitle={row.jobTitle}
										bio={row.bio}
										avatar={row.avatar}
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

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-2">
							<Link
								href={{
									pathname: `/client/profile/${username}/following`,
									query: page > 2 ? { page: page - 1 } : undefined
								}}
								aria-disabled={page <= 1}
								className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
									page > 1
										? 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5'
										: 'border-transparent text-neutral-300 dark:text-neutral-600 pointer-events-none'
								}`}
							>
								<FiChevronLeft className="w-4 h-4" />
								{t('PAGINATION_PREVIOUS')}
							</Link>
							<span className="text-sm text-neutral-500 dark:text-neutral-400">
								{t('PAGINATION_PAGE_OF', { current: page, total: totalPages })}
							</span>
							<Link
								href={{
									pathname: `/client/profile/${username}/following`,
									query: { page: page + 1 }
								}}
								aria-disabled={page >= totalPages}
								className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
									page < totalPages
										? 'border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5'
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
