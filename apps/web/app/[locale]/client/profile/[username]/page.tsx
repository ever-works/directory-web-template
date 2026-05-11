import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { ProfileHeader, ProfileContent } from '@/components/profile';
import {
	getClientProfileByUsername,
	listPortfolioProjectsForProfile,
	getProfileStats,
	isFollowing
} from '@/lib/db/queries';
import type { Profile, ProfileSkill } from '@/lib/types/profile';

// Force dynamic rendering — page depends on session/follow state
export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({ params }: { params: Promise<{ username: string }> }) {
	const { username } = await params;
	const clientProfile = await getClientProfileByUsername(username);
	if (!clientProfile) {
		notFound();
	}

	const session = await auth();
	const viewerUserId = session?.user?.id ?? null;
	const isOwn = !!viewerUserId && viewerUserId === clientProfile.userId;

	const [portfolioRows, stats, viewerFollows] = await Promise.all([
		listPortfolioProjectsForProfile(clientProfile.id),
		getProfileStats({ userId: clientProfile.userId, clientProfileId: clientProfile.id }),
		viewerUserId && !isOwn ? isFollowing(viewerUserId, clientProfile.userId) : Promise.resolve(false)
	]);

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
		isPublic: true,
		memberSince: clientProfile.createdAt?.toISOString().split('T')[0] || '2024-01-01',
		submissions: []
	};

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default">
				<div className="space-y-8 pb-16">
					<ProfileHeader
						profile={profile}
						isOwn={isOwn}
						isAuthenticated={!!viewerUserId}
						stats={{
							comments: stats.comments,
							favorites: stats.favorites,
							portfolio: stats.portfolio,
							followers: stats.followers,
							following: stats.following,
							submissions: clientProfile.totalSubmissions ?? 0
						}}
						initialIsFollowing={viewerFollows}
					/>
					<ProfileContent profile={profile} isOwn={isOwn} />
				</div>
			</Container>
		</div>
	);
}
