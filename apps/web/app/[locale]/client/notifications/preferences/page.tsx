import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { Container } from '@/components/ui/container';
import { PreferencesPageClient } from './_components/preferences-page-client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
	params
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'client.notifications.preferences' });
	return {
		title: safeT(t, 'pageTitle', 'Notification preferences')
	};
}

export default async function PreferencesPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/auth/sign-in?callbackUrl=/client/notifications/preferences');
	}

	return (
		<Container maxWidth="4xl" padding="default" className="py-6">
			<PreferencesPageClient />
		</Container>
	);
}

function safeT(t: Awaited<ReturnType<typeof getTranslations>>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
