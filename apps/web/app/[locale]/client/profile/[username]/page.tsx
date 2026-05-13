import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { FiChevronRight, FiUser } from 'react-icons/fi';
import {
	getClientProfileByUsername,
	listPortfolioProjectsForProfile,
	getProfileStats,
	isFollowing,
	getRecentCommentsByClientProfile,
	getRecentFavoritesByUser,
	listFollowing,
	listFollowers
} from '@/lib/db/queries';
import {
	ProfilePanel,
	ProfileStatsStrip,
	AboutSection,
	PortfolioSection,
	SkillsSection,
	RecentActivitySection
} from '@/components/profile';
import type { RecentFollow } from '@/components/profile/sections/recent-activity-section';
import type { Profile, ProfileSkill } from '@/lib/types/profile';

// Force dynamic rendering — page depends on session/follow state
export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({ params }: { params: Promise<{ username: string }> }) {
	const { username } = await params;
	const t = await getTranslations('profile');
	const clientProfile = await getClientProfileByUsername(username);
	if (!clientProfile) {
		notFound();
	}

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;
	const isOwn = !!viewerUserId && viewerUserId === clientProfile.userId;

	const [portfolioRows, stats, viewerFollows, recentComments, recentFavorites, outgoingFollows, incomingFollows] = await Promise.all([
		listPortfolioProjectsForProfile(clientProfile.id),
		getProfileStats({ userId: clientProfile.userId, clientProfileId: clientProfile.id }),
		viewerUserId && !isOwn ? isFollowing(viewerUserId, clientProfile.userId) : Promise.resolve(false),
		getRecentCommentsByClientProfile(clientProfile.id, 5),
		getRecentFavoritesByUser(clientProfile.userId, 5),
		listFollowing(clientProfile.userId, 5, 0),
		listFollowers(clientProfile.userId, 5, 0)
	]);

	const recentFollows: RecentFollow[] = [
		...outgoingFollows.map((row): RecentFollow => ({
			id: `out-${row.userId}-${row.followedAt.getTime()}`,
			otherUserId: row.userId,
			otherUsername: row.username,
			otherDisplayName: row.displayName,
			otherName: row.name,
			otherAvatar: row.avatar,
			direction: 'outgoing',
			createdAt: row.followedAt
		})),
		...incomingFollows.map((row): RecentFollow => ({
			id: `in-${row.userId}-${row.followedAt.getTime()}`,
			otherUserId: row.userId,
			otherUsername: row.username,
			otherDisplayName: row.displayName,
			otherName: row.name,
			otherAvatar: row.avatar,
			direction: 'incoming',
			createdAt: row.followedAt
		}))
	];

	const rawSkills = (clientProfile.skills ?? []) as Array<{
		name?: unknown;
		category?: unknown;
		proficiency?: unknown;
	}>;
	const skills: ProfileSkill[] = rawSkills
		.filter((s) => typeof s?.name === 'string' && (s.name as string).trim().length > 0)
		.map((s) => ({
			name: String(s.name),
			category: typeof s.category === 'string' ? s.category : 'Other',
			proficiency: typeof s.proficiency === 'number' ? s.proficiency : 0
		}));

	const interests = (clientProfile.interests ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	const profile: Profile = {
		username: clientProfile.username || clientProfile.email?.split('@')[0] || 'user',
		displayName: clientProfile.displayName || clientProfile.name || clientProfile.email?.split('@')[0] || 'User',
		bio: clientProfile.bio || '',
		avatar: clientProfile.avatar || '',
		location: clientProfile.location || '',
		company: clientProfile.company || '',
		jobTitle: clientProfile.jobTitle || '',
		skills,
		interests,
		website: clientProfile.website || '',
		socialLinks: [],
		portfolio: portfolioRows.map((p) => ({
			id: p.id,
			title: p.title,
			description: p.description,
			imageUrl: p.imageUrl,
			externalUrl: p.externalUrl,
			tags: (p.tags ?? []) as string[],
			isFeatured: !!p.isFeatured
		})),
		themeColor: '#3B82F6',
		coverColor: clientProfile.coverColor || '',
		isPublic: true,
		memberSince: clientProfile.createdAt?.toISOString().split('T')[0] || '2024-01-01',
		submissions: []
	};

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="space-y-6 py-8">
					{/* Breadcrumb */}
					<nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
						<Link
							href="/client/users"
							className="inline-flex items-center gap-1.5 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
						>
							<FiUser className="w-3.5 h-3.5" />
							{t('PROFILES_BREADCRUMB')}
						</Link>
						<FiChevronRight className="w-3.5 h-3.5" />
						<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 font-medium text-xs">
							{profile.displayName}
						</span>
					</nav>

					{/* 2-column dashboard */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
						{/* Left column — profile panel */}
						<aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-6 lg:self-start">
							<ProfilePanel
								profile={profile}
								isOwn={isOwn}
								isAuthenticated={!!viewerUserId}
								initialIsFollowing={viewerFollows}
								verified={!!clientProfile.emailVerified}
								stats={{ favorites: stats.favorites, portfolio: stats.portfolio, followers: stats.followers, following: stats.following }}
							/>
						</aside>

						{/* Right column — stats + sections */}
						<main className="lg:col-span-8 xl:col-span-9 space-y-6 min-w-0">
							{/* Headline stats */}
							<ProfileStatsStrip
								stats={{
									comments: stats.comments,
									favorites: stats.favorites,
									portfolio: stats.portfolio,
									followers: stats.followers,
									following: stats.following,
									submissions: clientProfile.totalSubmissions ?? 0
								}}
								username={profile.username}
								variant="headline"
							/>

							{/* Secondary stats row */}
							<ProfileStatsStrip
								stats={{
									comments: stats.comments,
									favorites: stats.favorites,
									portfolio: stats.portfolio,
									followers: stats.followers,
									following: stats.following,
									submissions: clientProfile.totalSubmissions ?? 0
								}}
								username={profile.username}
								variant="compact"
							/>

							{/* About + recent activity */}
							<section aria-labelledby="about-heading" className="space-y-4">
								<h2
									id="about-heading"
									className="text-lg font-semibold text-gray-900 dark:text-gray-100"
								>
									{t('ABOUT_SECTION')}
								</h2>
								<AboutSection profile={profile} isOwn={isOwn} />
							</section>

							{/* Recent activity */}
							<section aria-labelledby="activity-heading" className="space-y-4">
								<h2
									id="activity-heading"
									className="text-lg font-semibold text-gray-900 dark:text-gray-100"
								>
									{t('RECENT_ACTIVITY_SECTION')}
								</h2>
								<RecentActivitySection
									comments={recentComments}
									favorites={recentFavorites}
									follows={recentFollows}
									isOwn={isOwn}
									displayName={profile.displayName}
								/>
							</section>

							{/* Skills */}
							<section aria-labelledby="skills-heading" className="space-y-4">
								<div className="flex items-center justify-between">
									<h2
										id="skills-heading"
										className="text-lg font-semibold text-gray-900 dark:text-gray-100"
									>
										{t('SKILLS_EXPERTISE_SECTION')}
									</h2>
									{isOwn && (
										<Link
											href="/client/settings/profile/basic-info"
											className="text-sm text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
										>
											{t('MANAGE_LINK')}
										</Link>
									)}
								</div>
								<SkillsSection profile={profile} />
							</section>

							{/* Portfolio */}
							<section aria-labelledby="portfolio-heading" className="space-y-4">
								<div className="flex items-center justify-between">
									<h2
										id="portfolio-heading"
										className="text-lg font-semibold text-gray-900 dark:text-gray-100"
									>
										{t('PORTFOLIO_SECTION')}
									</h2>
									{isOwn && (
										<Link
											href="/client/settings/profile/portfolio"
											className="text-sm text-theme-primary-600 dark:text-theme-primary-400 hover:underline"
										>
											{t('MANAGE_LINK')}
										</Link>
									)}
								</div>
								<PortfolioSection profile={profile} />
							</section>
						</main>
					</div>
				</div>
			</Container>
		</div>
	);
}
