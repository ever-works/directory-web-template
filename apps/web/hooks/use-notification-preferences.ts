'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { NotificationPreferencesPayload } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

async function fetchPreferences(): Promise<NotificationPreferencesPayload> {
	const response = await serverClient.get<NotificationPreferencesPayload>(
		'/api/client/notifications/preferences'
	);
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed to load preferences');
	}
	return response.data;
}

async function savePreferences(payload: NotificationPreferencesPayload): Promise<NotificationPreferencesPayload> {
	const response = await serverClient.put<NotificationPreferencesPayload>(
		'/api/client/notifications/preferences',
		payload
	);
	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed to save preferences');
	}
	return response.data;
}

export function useNotificationPreferences() {
	const qc = useQueryClient();

	const query = useQuery({
		queryKey: CLIENT_NOTIFICATION_KEYS.preferences(),
		queryFn: fetchPreferences,
		staleTime: 5 * 60 * 1000
	});

	const mutation = useMutation({
		mutationFn: savePreferences,
		onSuccess: (data) => {
			qc.setQueryData(CLIENT_NOTIFICATION_KEYS.preferences(), data);
		}
	});

	return {
		preferences: query.data,
		isLoading: query.isLoading,
		isError: query.isError,
		save: mutation.mutate,
		saveAsync: mutation.mutateAsync,
		isSaving: mutation.isPending,
		saveError: mutation.error
	};
}
