'use client';

import { useQuery } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { NotificationStatsResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

async function fetchStats(): Promise<NotificationStatsResponse> {
	const response = await serverClient.get<{ success: boolean; data: NotificationStatsResponse; error?: string }>(
		'/api/client/notifications/stats'
	);
	if (!apiUtils.isSuccess(response) || !response.data?.data) {
		throw new Error(response.data?.error || apiUtils.getErrorMessage(response) || 'Failed to fetch stats');
	}
	return response.data.data;
}

export function useNotificationStats(enabled = true) {
	return useQuery({
		queryKey: CLIENT_NOTIFICATION_KEYS.stats(),
		queryFn: fetchStats,
		enabled,
		staleTime: 15 * 1000,
		refetchOnWindowFocus: true
	});
}
