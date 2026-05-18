'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';

import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

type ListPages = InfiniteData<NotificationListResponse>;

interface UseNotificationStreamOptions {
	enabled: boolean;
	onIncoming?: (n: NotificationListItem) => void;
}

export function useNotificationStream({ enabled, onIncoming }: UseNotificationStreamOptions) {
	const qc = useQueryClient();
	const onIncomingRef = useRef(onIncoming);
	onIncomingRef.current = onIncoming;

	useEffect(() => {
		if (!enabled) return;
		if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return;

		const source = new EventSource('/api/client/notifications/stream');

		const handleNotification = (event: MessageEvent) => {
			try {
				const notif = JSON.parse(event.data) as NotificationListItem;
				prependToCache(qc, notif);
				bumpStats(qc, notif);
				onIncomingRef.current?.(notif);
			} catch {
				// Ignore malformed payloads
			}
		};

		source.addEventListener('notification', handleNotification);

		return () => {
			source.removeEventListener('notification', handleNotification);
			source.close();
		};
	}, [enabled, qc]);
}

function prependToCache(qc: ReturnType<typeof useQueryClient>, notif: NotificationListItem) {
	qc.setQueriesData<ListPages>({ queryKey: CLIENT_NOTIFICATION_KEYS.all }, (current) => {
		if (!current || !('pages' in current)) return current;
		const pages = [...current.pages];
		const firstPage = pages[0];
		if (!firstPage) return current;
		// Replace if already present (group merge), otherwise prepend.
		const existing = firstPage.notifications.findIndex((n) => n.id === notif.id);
		const nextNotifications =
			existing >= 0
				? firstPage.notifications.map((n, i) => (i === existing ? notif : n))
				: [notif, ...firstPage.notifications];
		pages[0] = {
			...firstPage,
			notifications: nextNotifications,
			unreadCount: existing >= 0 ? firstPage.unreadCount : firstPage.unreadCount + 1
		};
		return { ...current, pages };
	});
}

function bumpStats(qc: ReturnType<typeof useQueryClient>, _notif: NotificationListItem) {
	// Cheap approach: invalidate. Stats refetch is small.
	qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.stats() });
}
