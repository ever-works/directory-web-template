'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

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

type ListPages = InfiniteData<NotificationListResponse>;

function updateListCache(qc: ReturnType<typeof useQueryClient>, id: string, isRead: boolean) {
	qc.setQueriesData<ListPages>({ queryKey: CLIENT_NOTIFICATION_KEYS.all }, (current) => {
		if (!current || !('pages' in current)) return current;
		return {
			...current,
			pages: current.pages.map((page) => {
				const nextUnread = Math.max(
					0,
					(page.unreadCount ?? 0) + (isRead ? -1 : 1)
				);
				return {
					...page,
					unreadCount: nextUnread,
					notifications: page.notifications.map((n) =>
						n.id === id
							? { ...n, isRead, readAt: isRead ? new Date().toISOString() : null }
							: n
					)
				};
			})
		};
	});
}

export function useMarkNotification() {
	const qc = useQueryClient();

	const single = useMutation({
		mutationFn: patchNotification,
		onMutate: async ({ id, isRead }) => {
			await qc.cancelQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
			updateListCache(qc, id, isRead);
		},
		onError: (_err, variables) => {
			// Revert by re-flipping
			updateListCache(qc, variables.id, !variables.isRead);
		},
		onSettled: () => {
			qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.stats() });
		}
	});

	const all = useMutation({
		mutationFn: markAllRead,
		onMutate: async () => {
			await qc.cancelQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.all });
			qc.setQueriesData<ListPages>({ queryKey: CLIENT_NOTIFICATION_KEYS.all }, (current) => {
				if (!current || !('pages' in current)) return current;
				return {
					...current,
					pages: current.pages.map((page) => ({
						...page,
						unreadCount: 0,
						notifications: page.notifications.map((n) => ({
							...n,
							isRead: true,
							readAt: n.readAt ?? new Date().toISOString()
						}))
					}))
				};
			});
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
