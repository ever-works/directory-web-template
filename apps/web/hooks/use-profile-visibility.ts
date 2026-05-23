'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { ProfileVisibility } from '@/lib/validations/user-profile';

export const USER_PROFILE_QUERY_KEY = ['user', 'profile'] as const;

type ProfileResponse = { profileVisibility?: ProfileVisibility; username?: string };

async function fetchProfile(): Promise<ProfileResponse> {
	const response = await serverClient.get<ProfileResponse>('/api/user/profile');
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch profile');
	}
	return response.data ?? {};
}

async function patchVisibility(visibility: ProfileVisibility): Promise<ProfileResponse> {
	const response = await serverClient.patch<ProfileResponse>('/api/user/profile', {
		profileVisibility: visibility
	});
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed to update visibility');
	}
	return response.data ?? {};
}

export function useProfileVisibility() {
	const queryClient = useQueryClient();

	const { data, isLoading, error } = useQuery({
		queryKey: USER_PROFILE_QUERY_KEY,
		queryFn: fetchProfile,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	});

	const mutation = useMutation({
		mutationFn: patchVisibility,
		onSuccess: (updated) => {
			queryClient.setQueryData<ProfileResponse>(USER_PROFILE_QUERY_KEY, (prev) => ({
				...(prev ?? {}),
				...updated
			}));
		}
	});

	return {
		visibility: (data?.profileVisibility ?? 'public') as ProfileVisibility,
		username: data?.username ?? '',
		isLoading,
		isSaving: mutation.isPending,
		error,
		setVisibility: (value: ProfileVisibility) => mutation.mutateAsync(value)
	};
}
