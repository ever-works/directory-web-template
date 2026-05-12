import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { FiArrowLeft, FiUserPlus } from 'react-icons/fi';
import {
	getClientProfileByUsername,
	getFollowerCount,
	getFollowingSubset,
	listFollowers
} from '@/lib/db/queries';
import { ProfileRow } from '@/components/profile/profile-row';
import { FOLLOW_LIST_PAGE_SIZE, parsePageParam } from '../_follow-list-shared';

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

	const [total, followers] = await Promise.all([
		getFollowerCount(profile.userId),
		listFollowers(profile.userId, FOLLOW_LIST_PAGE_SIZE, (page - 1) * FOLLOW_LIST_PAGE_SIZE)
	]);

	const followingSet = viewerUserId
		? await getFollowingSubset(viewerUserId, followers.map((f) => f.userId))
		: new Set<string>();

	const totalPages = Math.max(1, Math.ceil(total / FOLLOW_LIST_PAGE_SIZE));
	const displayName = profile.displayName || profile.name || profile.username || 'this user';

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="2xl" padding="default">
				<div className="space-y-6 py-8">
					<div className="flex items-center gap-3">
						<Link
							href={`/client/profile/${username}`}
							className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
						>
							<FiArrowLeft className="w-4 h-4" /> Back to profile
						</Link>
					</div>

					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
							People who follow {displayName}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
							{total} {total === 1 ? 'follower' : 'followers'}
						</p>
					</div>

					{followers.length === 0 ? (
						<Card className="p-10 text-center">
							<FiUserPlus className="w-10 h-10 mx-auto mb-3 text-gray-400" />
							<p className="text-gray-600 dark:text-gray-300 font-medium">No followers yet</p>
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
								When someone follows {displayName}, they will show up here.
							</p>
						</Card>
					) : (
						<div className="space-y-3">
							{followers.map((row) => {
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

					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4">
							<Link
								href={{
									pathname: `/client/profile/${username}/followers`,
									query: page > 2 ? { page: page - 1 } : undefined
								}}
								className={`text-sm ${page > 1 ? 'text-theme-primary-600 dark:text-theme-primary-400 hover:underline' : 'text-gray-400 pointer-events-none'}`}
								aria-disabled={page <= 1}
							>
								← Previous
							</Link>
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Page {page} of {totalPages}
							</span>
							<Link
								href={{
									pathname: `/client/profile/${username}/followers`,
									query: { page: page + 1 }
								}}
								className={`text-sm ${page < totalPages ? 'text-theme-primary-600 dark:text-theme-primary-400 hover:underline' : 'text-gray-400 pointer-events-none'}`}
								aria-disabled={page >= totalPages}
							>
								Next →
							</Link>
						</div>
					)}
				</div>
			</Container>
		</div>
	);
}
