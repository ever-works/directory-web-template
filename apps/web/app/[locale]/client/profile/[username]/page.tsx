import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { ProfileHeader, ProfileContent } from '@/components/profile';
import { getClientProfileByEmail, listPortfolioProjectsForProfile } from '@/lib/db/queries';
import { getLocale } from 'next-intl/server';
import type { Profile, ProfileSkill } from '@/lib/types/profile';

// Force dynamic rendering to ensure auth() runs on each request
export const dynamic = 'force-dynamic';

export default async function ClientProfilePage({ params }: { params: Promise<{ username: string }> }) {
	const { username } = await params;
	const locale = await getLocale();
	const session = await auth();

	// Check if user is authenticated
	if (!session?.user) {
		redirect(`/${locale}/auth/signin`);
	}

	// Check if user is admin - redirect to admin dashboard
	if (session.user.isAdmin === true) {
		redirect(`/${locale}/admin`);
	}

	// Validate that user has an email
	if (!session.user.email) {
		redirect(`/${locale}/auth/signin`);
	}

	// Get the client profile data directly
	const clientProfile = await getClientProfileByEmail(session.user.email);

	if (!clientProfile) {
		redirect(`/${locale}/client/dashboard`);
	}

	// Validate that the username in the URL matches the authenticated user
	const userUsername = clientProfile.username || clientProfile.email?.split('@')[0] || 'user';
	if (username !== userUsername) {
		redirect(`/${locale}/client/dashboard`);
	}

	const portfolioRows = await listPortfolioProjectsForProfile(clientProfile.id);

	const rawSkills = (clientProfile.skills ?? []) as Array<{ name?: unknown; category?: unknown; proficiency?: unknown }>;
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
					<ProfileHeader profile={profile} />
					<ProfileContent profile={profile} />
				</div>
			</Container>
		</div>
	);
}
