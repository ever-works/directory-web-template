import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface TenantMember {
	id: string;
	email: string;
	role: string;
	joinedAt: string;
}

export interface TenantInvitation {
	id: string;
	email: string;
	role: string;
	status: string;
	invitedAt: string;
	token: string;
}

export interface TenantData {
	id: string;
	name: string;
	slug: string;
	ownerId: string;
}

export function useTenantData() {
	const queryClient = useQueryClient();

	const { data: members, isLoading: isLoadingMembers } = useQuery<TenantMember[]>({
		queryKey: ['tenant-members'],
		queryFn: async () => {
			const response = await fetch('/api/tenants/members');
			if (!response.ok) throw new Error('Failed to fetch members');
			const data = await response.json();
			return data.members;
		}
	});

	const { data: invitations, isLoading: isLoadingInvitations } = useQuery<TenantInvitation[]>({
		queryKey: ['tenant-invitations'],
		queryFn: async () => {
			const response = await fetch('/api/tenants/invitations');
			if (!response.ok) throw new Error('Failed to fetch invitations');
			const data = await response.json();
			return data.invitations;
		}
	});

	const inviteMember = useMutation({
		mutationFn: async (email: string) => {
			const response = await fetch('/api/tenants/invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }) // Let backend handle default role assignment
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to invite member');
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success('Invitation sent successfully');
			queryClient.invalidateQueries({ queryKey: ['tenant-invitations'] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		}
	});

	const removeMember = useMutation({
		mutationFn: async (userId: string) => {
			const response = await fetch(`/api/tenants/members/${userId}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to remove member');
			return response.json();
		},
		onSuccess: () => {
			toast.success('Member removed successfully');
			queryClient.invalidateQueries({ queryKey: ['tenant-members'] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		}
	});

	const cancelInvitation = useMutation({
		mutationFn: async (invitationId: string) => {
			// We need an endpoint to delete/cancel invitation by ID.
			// Currently we only have DELETE /api/tenants/invitations which might delete by email or token?
			// Let's assume we might need to update the API or use a specific route.
			// Checking existing API: DELETE /api/tenants/invitations
			const response = await fetch(`/api/tenants/invitations?id=${invitationId}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to cancel invitation');
			return response.json();
		},
		onSuccess: () => {
			toast.success('Invitation cancelled');
			queryClient.invalidateQueries({ queryKey: ['tenant-invitations'] });
		},
		onError: (error: Error) => {
			toast.error(error.message);
		}
	});

	return {
		members,
		invitations,
		isLoading: isLoadingMembers || isLoadingInvitations,
		inviteMember,
		removeMember,
		cancelInvitation
	};
}
