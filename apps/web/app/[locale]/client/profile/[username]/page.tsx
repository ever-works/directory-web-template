import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/container';
import { Link } from '@/i18n/navigation';
import { FiChevronRight, FiUser, FiBarChart2, FiLock, FiEye, FiArrowLeft } from 'react-icons/fi';
import {
	getClientProfileByUsername,
	listPortfolioProjectsForProfile,
	getProfileStats,
	isFollowing,
	getRecentCommentsByClientProfile,
	getRecentFavoritesByUser,
	listFollowing,
	listFollowers,
	toPublicClientProfile
} from '@/lib/db/queries';
import {
	ProfilePanel,
	ProfileStatsStrip,
	AboutSection,
	PortfolioSection,
	SkillsSection,
	RecentActivitySection,
	SecurityStatusSection,
	BillingPlansSection
} from '@/components/profile';
import type { RecentFollow } from '@/components/profile/sections/recent-activity-section';
import type { Profile, ProfileSkill } from '@/lib/types/profile';

// Force dynamic rendering — page depends on session/follow state
export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({
	params,
	searchParams
}: {
	params: Promise<{ username: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const { username } = await params;
	const sp = await searchParams;
	const t = await getTranslations('profile');
	const rawProfile = await getClientProfileByUsername(username);
	if (!rawProfile) {
		notFound();
	}

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;
	const isOwn = !!viewerUserId && viewerUserId === rawProfile.userId;

	// Project to the public-safe column set BEFORE any rendering. Owner and
	// non-owner alike render the same fields here, and the type system now
	// prevents downstream code from touching email / phone / moderation flags
	// / tenant id / billing fields.
	const clientProfile = toPublicClientProfile(rawProfile);

	// Owner-only "preview as public" mode. Toggled via `?preview=public`; ignored
	// for non-owners (their experience is already the public one). Inside preview
	// mode we render exactly as a visitor would, including the private placeholder.
	const previewAsPublic = isOwn && sp.preview === 'public';
	const effectiveIsOwn = isOwn && !previewAsPublic;

	const isPrivate = clientProfile.profileVisibility === 'private';
	if (isPrivate && !effectiveIsOwn) {
		const exitPreviewHref = `/client/profile/${username}`;
		return (
			<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
				<Container maxWidth="7xl" padding="default" useGlobalWidth>
					<div className="py-8 max-w-md mx-auto">
						<div className="rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] shadow-sm p-8 text-center space-y-3">
							<div className="mx-auto w-10 h-10 rounded-full bg-gray-100 dark:bg-white/6 flex items-center justify-center">
								<FiLock className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
							</div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
								{t('PRIVATE_TITLE')}
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{t('PRIVATE_DESCRIPTION')}
							</p>
							<div className="pt-2">
								<Link
									href={previewAsPublic ? exitPreviewHref : '/client/users'}
									className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
								>
									{previewAsPublic ? (
										<FiArrowLeft className="w-3.5 h-3.5" />
									) : (
										<FiUser className="w-3.5 h-3.5" />
									)}
									{previewAsPublic ? t('EXIT_PREVIEW') : t('PROFILES_BREADCRUMB')}
								</Link>
							</div>
						</div>
					</div>
				</Container>
			</div>
		);
	}

	// Activity feed (recent comments / favorites / follows) is rendered ONLY to
	// the owner — matches LinkedIn / GitHub / Upwork, where browsing behaviour
	// isn't exposed on a public profile. Skip the fetches entirely otherwise.
	const [portfolioRows, stats, viewerFollows, recentComments, recentFavorites, outgoingFollows, incomingFollows] = await Promise.all([
		listPortfolioProjectsForProfile(clientProfile.id),
		getProfileStats({ userId: clientProfile.userId, clientProfileId: clientProfile.id }),
		viewerUserId && !isOwn ? isFollowing(viewerUserId, clientProfile.userId) : Promise.resolve(false),
		effectiveIsOwn ? getRecentCommentsByClientProfile(clientProfile.id, 10) : Promise.resolve([]),
		effectiveIsOwn ? getRecentFavoritesByUser(clientProfile.userId, 10) : Promise.resolve([]),
		effectiveIsOwn ? listFollowing(clientProfile.userId, 8, 0) : Promise.resolve([]),
		effectiveIsOwn ? listFollowers(clientProfile.userId, 8, 0) : Promise.resolve([])
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

	// Honour the existing locationPrivacy setting for the free-form `location`
	// text too — previously it only gated lat/long, which let "Private" users
	// still leak their city via the plain text field.
	const locationVisible = effectiveIsOwn || clientProfile.locationPrivacy !== 'private';

	const profile: Profile = {
		// No email-local-part fallback: leaking the local-part of a stranger's
		// email is an identity disclosure. `name` is set at signup, so the
		// 'user' / 'User' floor is essentially unreachable in practice.
		username: clientProfile.username || 'user',
		displayName: clientProfile.displayName || clientProfile.name || 'User',
		bio: clientProfile.bio || '',
		avatar: clientProfile.avatar || '',
		location: locationVisible ? clientProfile.location || '' : '',
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
		isPublic: !isPrivate,
		memberSince: clientProfile.createdAt?.toISOString().split('T')[0] || '2024-01-01',
		submissions: []
	};

	const previewHref = `/client/profile/${username}?preview=public`;
	const exitPreviewHref = `/client/profile/${username}`;

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="space-y-6 py-8">
					{/* Breadcrumb + own-profile actions */}
					<div className="flex items-center justify-between gap-3">
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
						{isOwn && (
							<div className="flex items-center gap-2">
								{previewAsPublic ? (
									<Link
										href={exitPreviewHref}
										className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-theme-primary-300 dark:border-theme-primary-700 text-theme-primary-700 dark:text-theme-primary-300 bg-theme-primary-50 dark:bg-theme-primary-900/30 hover:bg-theme-primary-100 dark:hover:bg-theme-primary-900/50 transition-colors"
									>
										<FiArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
										{t('EXIT_PREVIEW')}
									</Link>
								) : (
									<Link
										href={previewHref}
										className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
									>
										<FiEye className="w-3.5 h-3.5" aria-hidden="true" />
										{t('PREVIEW_PUBLIC_VIEW')}
									</Link>
								)}
								<Link
									href="/client/dashboard"
									className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
								>
									<FiBarChart2 className="w-3.5 h-3.5" aria-hidden="true" />
									{t('BACK_TO_DASHBOARD')}
								</Link>
							</div>
						)}
					</div>

					{/* 2-column dashboard */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
						{/* Left column — profile panel */}
						<aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-6 lg:self-start">
							<ProfilePanel
								profile={profile}
								isOwn={effectiveIsOwn}
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
								<AboutSection profile={profile} isOwn={effectiveIsOwn} />
							</section>

							{/* Recent activity — owner-only. The feed exposes comment text,
								favourited items and the inbound/outbound follow ledger; none
								of that belongs on a public profile (cf. LinkedIn/GitHub/Upwork). */}
							{effectiveIsOwn && (
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
										isOwn={effectiveIsOwn}
										displayName={profile.displayName}
									/>
								</section>
							)}

							{/* Skills */}
							<section aria-labelledby="skills-heading" className="space-y-4">
								<div className="flex items-center justify-between">
									<h2
										id="skills-heading"
										className="text-lg font-semibold text-gray-900 dark:text-gray-100"
									>
										{t('SKILLS_EXPERTISE_SECTION')}
									</h2>
									{effectiveIsOwn && (
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
									{effectiveIsOwn && (
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

							{/* Security & Status + Billing & Plans — owner-only. These
								expose account-private fields (verification, 2FA, lifecycle
								status, plan, billing) that `toPublicClientProfile` strips, so
								they read from the unprojected `rawProfile` and are hidden in
								public-preview mode (`effectiveIsOwn`). */}
							{effectiveIsOwn && (
								<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
									<section aria-label={t('SECURITY_STATUS_SECTION')}>
										<SecurityStatusSection
											emailVerified={!!rawProfile.emailVerified}
											twoFactorEnabled={!!rawProfile.twoFactorEnabled}
											status={rawProfile.status ?? 'active'}
											memberSince={profile.memberSince}
										/>
									</section>
									<section aria-label={t('BILLING_PLANS_SECTION')}>
										<BillingPlansSection
											plan={rawProfile.plan ?? 'free'}
											accountType={rawProfile.accountType ?? 'individual'}
											currency={rawProfile.currency ?? 'USD'}
										/>
									</section>
								</div>
							)}
						</main>
					</div>
				</div>
			</Container>
		</div>
	);
}

