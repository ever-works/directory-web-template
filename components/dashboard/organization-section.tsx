'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building, UserPlus, Trash2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantData } from '@/hooks/use-tenant-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function OrganizationSection() {
	const t = useTranslations('organization');
	const { user } = useCurrentUser();
	const { members, invitations, isLoading, inviteMember, removeMember, cancelInvitation } = useTenantData();
	const [inviteEmail, setInviteEmail] = useState('');
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

	const handleInvite = async () => {
		if (!inviteEmail) return;
		try {
			await inviteMember.mutateAsync(inviteEmail);
			setInviteEmail('');
			setIsInviteDialogOpen(false);
		} catch {
			// Error handled in hook
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (confirm(t('CONFIRM_REMOVE_MEMBER'))) {
			try {
				await removeMember.mutateAsync(userId);
			} catch {
				// Error handled in hook
			}
		}
	};

	const handleCancelInvitation = async (invitationId: string) => {
		try {
			await cancelInvitation.mutateAsync(invitationId);
		} catch {
			// Error handling in hook
		}
	};

	if (isLoading) {
		return <div className="p-8 text-center">{t('LOADING')}</div>;
	}

	return (
		<div className="space-y-8">
			{/* Organization Profile Card */}
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center space-x-4 mb-6">
					<div className="h-12 w-12 bg-theme-primary/10 rounded-full flex items-center justify-center">
						<Building className="h-6 w-6 text-theme-primary" />
					</div>
					<div>
						<h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
							{t('ORGANIZATION_SETTINGS')}
						</h2>
						<p className="text-gray-500 text-sm">{t('MANAGE_ORGANIZATION_DESC')}</p>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							{t('ORGANIZATION_ID')}
						</label>
						<div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md font-mono text-sm">
							{user?.tenantId || '...'}
						</div>
					</div>
				</div>
			</div>

			{/* Members Section */}
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center space-x-2">
						<Users className="h-5 w-5 text-gray-500" />
						<h3 className="text-lg font-semibold">{t('MEMBERS')}</h3>
					</div>

					<Button
						className="bg-theme-primary text-white hover:bg-theme-primary/90"
						onClick={() => setIsInviteDialogOpen(true)}
					>
						<UserPlus className="h-4 w-4 mr-2" />
						{t('INVITE_MEMBER')}
					</Button>

					<Modal
						isOpen={isInviteDialogOpen}
						onClose={() => setIsInviteDialogOpen(false)}
						title={t('INVITE_MEMBER')}
						subtitle={t('INVITE_MEMBER_DESC')}
					>
						<ModalContent>
							<div className="py-4">
								<label className="text-sm font-medium mb-2 block">{t('EMAIL_ADDRESS')}</label>
								<Input
									placeholder="colleague@company.com"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
								/>
							</div>
						</ModalContent>
						<ModalFooter>
							<Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
								{t('CANCEL')}
							</Button>
							<Button onClick={handleInvite} disabled={!inviteEmail || inviteMember.isPending}>
								{inviteMember.isPending ? t('SENDING') : t('SEND_INVITE')}
							</Button>
						</ModalFooter>
					</Modal>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t('USER')}</TableHead>
							<TableHead>{t('ROLE')}</TableHead>
							<TableHead>{t('JOINED')}</TableHead>
							<TableHead className="text-right">{t('ACTIONS')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members?.map((member) => (
							<TableRow key={member.id}>
								<TableCell>
									<div className="flex items-center space-x-3">
										<div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
											<span className="text-xs font-bold">{member.email[0].toUpperCase()}</span>
										</div>
										<div>
											<div className="font-medium">{member.email}</div>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<Badge variant="outline" className="capitalize">
										{member.role || 'Member'}
									</Badge>
								</TableCell>
								<TableCell className="text-gray-500 text-sm">
									{new Date(member.joinedAt).toLocaleDateString()}
								</TableCell>
								<TableCell className="text-right">
									{user?.id !== member.id && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveMember(member.id)}
											className="text-red-500 hover:text-red-700 hover:bg-red-50"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
						{members?.length === 0 && (
							<TableRow>
								<TableCell colSpan={4} className="text-center py-8 text-gray-500">
									{t('NO_MEMBERS')}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Invitations Section */}
			{invitations && invitations.length > 0 && (
				<div className="bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
					<div className="flex items-center space-x-2 mb-6">
						<Mail className="h-5 w-5 text-gray-500" />
						<h3 className="text-lg font-semibold">{t('PENDING_INVITATIONS')}</h3>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('EMAIL')}</TableHead>
								<TableHead>{t('STATUS')}</TableHead>
								<TableHead>{t('SENT')}</TableHead>
								<TableHead className="text-right">{t('ACTIONS')}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{invitations.map((invite) => (
								<TableRow key={invite.id}>
									<TableCell>{invite.email}</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className="capitalize bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200"
										>
											{invite.status}
										</Badge>
									</TableCell>
									<TableCell className="text-gray-500 text-sm">
										{new Date(invite.invitedAt).toLocaleDateString()}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleCancelInvitation(invite.id)}
											className="text-gray-500 hover:text-gray-700"
										>
											{t('CANCEL')}
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
