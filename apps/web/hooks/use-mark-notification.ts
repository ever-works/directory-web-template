'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { isSystemType } from '@/lib/notifications/registry';
import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS, adjustStatsCache, getQueryTab, resetStatsCache } from './use-notifications';

interface MarkVariables {
	id: string;
	isRead: boolean;
}

async function patchNotification({ id, isRead }: MarkVariables): Promise<NotificationListItem> {
	const response = await serverClient.patch<{ success: boolean; data: NotificationListItem; error?: string }>(
		`/api/client/notifications/${id}`,
		{ isRead }
	);
	if (!apiUtils.isSuccess(response) || !response.data?.data) {
		throw new Error(response.data?.error || apiUtils.getErrorMessage(response) || 'Failed to update notification');
	}
	return response.data.data;
}

async function markAllRead(): Promise<{ updatedCount: number }> {
	const response = await serverClient.post<{ success: boolean; data: { updatedCount: number }; error?: string }>(
		'/api/client/notifications/mark-all-read'
	);
	if (!apiUtils.isSuccess(response) || !response.data?.data) {
		throw new Error(response.data?.error || apiUtils.getErrorMessage(response) || 'Failed to mark all read');
	}
	return response.data.data;
}

function findNotification(qc: ReturnType<typeof useQueryClient>, id: string): NotificationListItem | undefined {
	const entries = qc.getQueriesData<NotificationListResponse>({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
	for (const [, current] of entries) {
		if (!current || !('notifications' in current)) continue;
		const found = current.notifications.find((n) => n.id === id);
		if (found) return found;
	}
	return undefined;
}

function updateListCache(qc: ReturnType<typeof useQueryClient>, id: string, isRead: boolean) {
	const entries = qc.getQueriesData<NotificationListResponse>({ queryKey: CLIENT_NOTIFICATION_KEYS.all });

	for (const [queryKey, current] of entries) {
		if (!current || !('notifications' in current)) continue;
		if (!current.notifications.some((n) => n.id === id)) continue;

		const nextUnread = Math.max(0, (current.unreadCount ?? 0) + (isRead ? -1 : 1));

		// The "Unread" tab only ever shows isRead=false items — once one is
		// marked read it must drop out of that cached list immediately,
		// rather than lingering as a "read" row under "Unread".
		if (getQueryTab(queryKey) === 'unread' && isRead) {
			qc.setQueryData(queryKey, {
				...current,
				unreadCount: nextUnread,
				total: Math.max(0, (current.total ?? 0) - 1),
				notifications: current.notifications.filter((n) => n.id !== id)
			});
			continue;
		}

		qc.setQueryData(queryKey, {
			...current,
			unreadCount: nextUnread,
			notifications: current.notifications.map((n) =>
				n.id === id ? { ...n, isRead, readAt: isRead ? new Date().toISOString() : null } : n
			)
		});
	}
}

export function useMarkNotification() {
	const qc = useQueryClient();

	const single = useMutation({
		mutationFn: patchNotification,
		onMutate: async ({ id, isRead }) => {
			await qc.cancelQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
			const notif = findNotification(qc, id);
			updateListCache(qc, id, isRead);
			if (notif && notif.isRead !== isRead) {
				adjustStatsCache(qc, isRead ? -1 : 1, { system: isSystemType(notif.type) });
			}
		},
		onError: () => {
			// The optimistic update may have dropped the item from a cached
			// "Unread" list entirely, so a simple flag-flip can't restore it —
			// refetch everything to resync with the server.
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.stats() });
		}
	});

	const all = useMutation({
		mutationFn: markAllRead,
		onMutate: async () => {
			await qc.cancelQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
			qc.setQueriesData<NotificationListResponse>({ queryKey: CLIENT_NOTIFICATION_KEYS.all }, (current) => {
				if (!current || !('notifications' in current)) return current;
				return {
					...current,
					unreadCount: 0,
					notifications: current.notifications.map((n) => ({
						...n,
						isRead: true,
						readAt: n.readAt ?? new Date().toISOString()
					}))
				};
			});
			resetStatsCache(qc);
		},
		onError: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
		}
	});

	return {
		markRead: (id: string) => single.mutate({ id, isRead: true }),
		markUnread: (id: string) => single.mutate({ id, isRead: false }),
		markAllRead: () => all.mutate(),
		isPending: single.isPending || all.isPending
	};
}
