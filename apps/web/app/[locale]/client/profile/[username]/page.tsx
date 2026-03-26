import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { ProfileHeader, ProfileContent } from '@/components/profile';
import { getClientProfileByEmail } from '@/lib/db/queries';
import { getLocale } from 'next-intl/server';

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

	// Use client profile data
	const profile = {
		username: clientProfile.username || clientProfile.email?.split('@')[0] || 'user',
		displayName: clientProfile.displayName || clientProfile.name || clientProfile.email?.split('@')[0] || 'User',
		bio: clientProfile.bio || 'User profile',
		avatar: '', // Client profiles don't have avatar field
		location: clientProfile.location || 'Unknown',
		company: clientProfile.company || 'Unknown',
		jobTitle: clientProfile.jobTitle || 'User',
		skills: [], // This would come from a separate skills table in the future
		interests: [], // This would come from a separate interests table in the future
		website: clientProfile.website || '',
		socialLinks: [], // This would come from a separate social links table in the future
		portfolio: [], // This would come from a separate portfolio table in the future
		themeColor: '#3B82F6',
		isPublic: true,
		memberSince: clientProfile.createdAt?.toISOString().split('T')[0] || '2024-01-01',
		submissions: [] // This would come from submissions table
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
