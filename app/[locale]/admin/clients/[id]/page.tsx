import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getClientProfileById, getLastLoginActivity } from '@/lib/db/queries';

import { ClientDetailContent } from './client-detail-content';

type Params = { id: string; locale?: string };

export default async function ClientDetailPage({ params }: { params: Promise<Params> }) {
	const { id, locale: paramLocale } = await params;

	const session = await auth();
	if (!session?.user?.isAdmin) {
		const locale = paramLocale || 'en';
		redirect(`/${locale}/auth/signin`);
	}

	const tenantId = session.user.tenantId;
	if (!tenantId) {
		const locale = paramLocale || 'en';
		redirect(`/${locale}/auth/signin`);
	}
	const profile = await getClientProfileById(id, tenantId);
	if (!profile) {
		notFound();
	}

	const lastLogin = await getLastLoginActivity(profile.id, 'client');
	const locale = paramLocale || 'en';

	return <ClientDetailContent profile={profile} lastLogin={lastLogin} locale={locale} />;
}
