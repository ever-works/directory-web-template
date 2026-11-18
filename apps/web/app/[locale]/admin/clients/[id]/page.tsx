import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClientProfileById, getLastLoginActivity, listPortfolioProjectsForProfile, getProfileStats } from '@/lib/db/queries';
import { isAdmin } from '@/lib/db/roles';
import type { PortfolioItem } from '@/lib/types/profile';

import { ClientDetailContent } from './client-detail-content';

type Params = { id: string; locale?: string };

export default async function ClientDetailPage({ params }: { params: Promise<Params> }) {
	const { id, locale: paramLocale } = await params;

	const session = await auth();
	if (!session?.user?.id) {
		const locale = paramLocale || 'en';
		redirect(`/${locale}/auth/signin`);
	}

	// Check the live role, not the session's isAdmin claim: the claim is set at sign-in and stays for the
	// JWT's 30-day lifetime, so a user whose admin role was removed still has it. A failed lookup throws and
	// renders the error page, never the client data below.
	if (!(await isAdmin(session.user.id))) {
		redirect('/unauthorized');
	}

	const profile = await getClientProfileById(id);
	if (!profile) {
		notFound();
	}

	const locale = paramLocale || 'en';

	const [lastLogin, portfolioRows, stats] = await Promise.all([
		getLastLoginActivity(profile.id, 'client'),
		listPortfolioProjectsForProfile(profile.id),
		getProfileStats({ userId: profile.userId, clientProfileId: profile.id })
	]);

	const portfolio: PortfolioItem[] = portfolioRows.map((p) => ({
		id: p.id,
		title: p.title,
		description: p.description ?? '',
		imageUrl: p.imageUrl ?? '',
		externalUrl: p.externalUrl ?? '',
		tags: (p.tags ?? []) as string[],
		isFeatured: !!p.isFeatured
	}));

	return <ClientDetailContent profile={profile} lastLogin={lastLogin} locale={locale} portfolio={portfolio} stats={stats} />;
}
