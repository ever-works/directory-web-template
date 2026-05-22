import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClientProfileById, getLastLoginActivity, listPortfolioProjectsForProfile, getProfileStats } from '@/lib/db/queries';
import type { PortfolioItem } from '@/lib/types/profile';

import { ClientDetailContent } from './client-detail-content';

type Params = { id: string; locale?: string };

export default async function ClientDetailPage({ params }: { params: Promise<Params> }) {
	const { id, locale: paramLocale } = await params;

	const session = await auth();
	if (!session?.user?.isAdmin) {
		const locale = paramLocale || 'en';
		redirect(`/${locale}/auth/signin`);
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
