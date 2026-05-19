'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS } from './use-notifications';

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
				bumpStats(qc);
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
	qc.setQueriesData<NotificationListResponse>({ queryKey: CLIENT_NOTIFICATION_KEYS.all }, (current) => {
		if (!current || !('notifications' in current)) return current;
		const existing = current.notifications.findIndex((n) => n.id === notif.id);
		if (existing >= 0) {
			return {
				...current,
				notifications: current.notifications.map((n, i) => (i === existing ? notif : n))
			};
		}
		return {
			...current,
			notifications: [notif, ...current.notifications],
			total: (current.total ?? 0) + 1,
			unreadCount: (current.unreadCount ?? 0) + 1
		};
	});
}

function bumpStats(qc: ReturnType<typeof useQueryClient>) {
	qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.stats() });
}
