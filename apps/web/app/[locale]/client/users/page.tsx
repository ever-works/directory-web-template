import { auth } from '@/lib/auth';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { FiSearch, FiUsers } from 'react-icons/fi';
import { searchPublicProfiles, getFollowingSubset } from '@/lib/db/queries';
import { ProfileRow } from '@/components/profile/profile-row';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

function parsePage(input: string | string[] | undefined): number {
	const v = Array.isArray(input) ? input[0] : input;
	const n = Number.parseInt(v ?? '1', 10);
	return !Number.isFinite(n) || n < 1 ? 1 : n;
}

export default async function UsersDirectoryPage({
	searchParams
}: {
	searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
	const params = await searchParams;
	const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
	const query = rawQuery?.trim() ?? '';
	const page = parsePage(params.page);

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;

	const { rows, total, totalPages } = await searchPublicProfiles({
		query,
		page,
		limit: PAGE_SIZE
	});

	const followingSet = viewerUserId
		? await getFollowingSubset(viewerUserId, rows.map((r) => r.userId))
		: new Set<string>();

	const heading = query ? `Results for "${query}"` : 'Discover users';

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="2xl" padding="default">
				<div className="space-y-6 py-8">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
							<FiUsers className="w-6 h-6 text-theme-primary-500" />
							{heading}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
							{total} {total === 1 ? 'profile' : 'profiles'}
						</p>
					</div>

					{/* Search form — GET so the URL is the source of truth */}
					<form method="GET" className="flex gap-2">
						<div className="relative flex-1">
							<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
							<input
								type="text"
								name="q"
								defaultValue={query}
								placeholder="Search by name, username, role, location…"
								className="w-full pl-10 pr-4 h-11 rounded-lg border-2 border-gray-200 dark:border-white/8 bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500"
							/>
						</div>
						<button
							type="submit"
							className="px-5 h-11 rounded-lg bg-theme-primary-600 hover:bg-theme-primary-700 text-white font-medium text-sm"
						>
							Search
						</button>
					</form>

					{rows.length === 0 ? (
						<Card className="p-10 text-center">
							<FiUsers className="w-10 h-10 mx-auto mb-3 text-gray-400" />
							<p className="text-gray-600 dark:text-gray-300 font-medium">
								{query ? 'No profiles match your search.' : 'No profiles yet.'}
							</p>
							{query && (
								<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
									Try a broader query, or{' '}
									<Link href="/client/users" className="text-theme-primary-600 dark:text-theme-primary-400 hover:underline">
										browse everyone
									</Link>
									.
								</p>
							)}
						</Card>
					) : (
						<div className="space-y-3">
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
									pathname: '/client/users',
									query: {
										...(query ? { q: query } : {}),
										...(page > 2 ? { page: page - 1 } : {})
									}
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
									pathname: '/client/users',
									query: {
										...(query ? { q: query } : {}),
										page: page + 1
									}
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
