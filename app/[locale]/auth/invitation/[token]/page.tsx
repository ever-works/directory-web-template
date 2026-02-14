import { auth } from '@/lib/auth';
import { getInvitationByToken } from '@/lib/services/tenant.service';
import { InvitationCard } from './invitation-card';
import { getTranslations } from 'next-intl/server';

interface InvitationPageProps {
	params: Promise<{
		token: string;
		locale: string;
	}>;
}

export default async function InvitationPage({ params }: InvitationPageProps) {
	const { token, locale } = await params;
	const session = await auth();
	const invitation = await getInvitationByToken(token);
	const t = await getTranslations({ locale, namespace: 'INVITATION' });

	if (!invitation) {
		return (
			<div className="container flex items-center justify-center min-h-[60vh]">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">{t('INVALID')}</h1>
				</div>
			</div>
		);
	}

	return (
		<div className="container flex items-center justify-center min-h-[60vh] py-12">
			<InvitationCard
				token={token}
				invitation={{
					tenantName: invitation.tenantName,
					inviterName: invitation.inviterName || invitation.inviterEmail || '',
					status: invitation.status,
					expiresAt: invitation.expiresAt
				}}
				hasSession={!!session?.user}
			/>
		</div>
	);
}
