'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface InvitationCardProps {
	token: string;
	invitation: {
		tenantName: string;
		inviterName: string;
		status: string;
		expiresAt: Date;
	};
	hasSession: boolean;
}

export function InvitationCard({ token, invitation, hasSession }: InvitationCardProps) {
	const t = useTranslations('INVITATION');
	const router = useRouter();
	const [isAccepting, setIsAccepting] = useState(false);

	const handleAccept = async () => {
		setIsAccepting(true);
		try {
			const response = await fetch(`/api/tenants/invitations/${token}/accept`, {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to accept invitation');
			}

			toast.success(t('SUCCESS_JOINED', { tenantName: invitation.tenantName }));
			router.push('/dashboard');
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Something went wrong');
		} finally {
			setIsAccepting(false);
		}
	};

	const isExpired = new Date(invitation.expiresAt) < new Date();
	const isAccepted = invitation.status === 'accepted';
	const isInvalid = !invitation.tenantName;

	if (isInvalid) {
		return (
			<Card className="w-full max-w-md mx-auto">
				<CardContent className="pt-6 text-center">
					<XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold mb-2">{t('INVALID')}</h2>
				</CardContent>
			</Card>
		);
	}

	if (isExpired || isAccepted) {
		return (
			<Card className="w-full max-w-md mx-auto">
				<CardContent className="pt-6 text-center">
					<XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-bold mb-2">{isAccepted ? t('ALREADY_ACCEPTED') : t('EXPIRED')}</h2>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md mx-auto animate-fade-in">
			<CardHeader className="text-center">
				<div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
					<CheckCircle className="h-6 w-6 text-primary" />
				</div>
				<CardTitle className="text-2xl">{t('TITLE')}</CardTitle>
				<CardDescription>
					{t('DESCRIPTION', {
						tenantName: invitation.tenantName,
						inviter: invitation.inviterName || 'Someone'
					})}
				</CardDescription>
			</CardHeader>

			<CardFooter className="flex flex-col space-y-3">
				{hasSession ? (
					<Button onClick={handleAccept} className="w-full" disabled={isAccepting}>
						{isAccepting ? 'Acccepting...' : t('ACCEPT')}
					</Button>
				) : (
					<div className="w-full space-y-3">
						<Button
							variant="outline"
							onClick={() => router.push(`/auth/signin?callbackUrl=/auth/invitation/${token}`)}
							className="w-full"
						>
							{t('LOGIN_TO_ACCEPT')}
						</Button>
						<Button
							onClick={() => router.push(`/auth/signup?callbackUrl=/auth/invitation/${token}`)}
							className="w-full"
						>
							{t('CREATE_ACCOUNT_TO_ACCEPT')}
						</Button>
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
