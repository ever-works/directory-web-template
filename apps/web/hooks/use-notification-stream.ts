'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { isSystemType, type NotificationTab } from '@/lib/notifications/registry';
import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications/types';
import { CLIENT_NOTIFICATION_KEYS, adjustStatsCache, getListQueryFilters, isPlainListQuery } from './use-notifications';

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
	const entries = qc.getQueriesData<NotificationListResponse>({ queryKey: CLIENT_NOTIFICATION_KEYS.all });

	for (const [queryKey, current] of entries) {
		if (!current || !('notifications' in current)) continue;

		const existing = current.notifications.findIndex((n) => n.id === notif.id);
		if (existing >= 0) {
			qc.setQueryData(queryKey, {
				...current,
				notifications: current.notifications.map((n, i) => (i === existing ? notif : n))
			});
			continue;
		}

		// Only inject brand-new items into plain (unfiltered) lists whose tab
		// the notification actually belongs to — otherwise a fresh "All"
		// item could leak into a cached "System" tab, etc.
		const filters = getListQueryFilters(queryKey);
		if (!isPlainListQuery(queryKey)) continue;
		if (filters.page && filters.page > 1) continue;
		if (!matchesTab(filters.tab ?? 'all', notif)) continue;

		qc.setQueryData(queryKey, {
			...current,
			notifications: [notif, ...current.notifications],
			total: (current.total ?? 0) + 1,
			unreadCount: notif.isRead ? current.unreadCount : (current.unreadCount ?? 0) + 1
		});
	}
}

function matchesTab(tab: NotificationTab, notif: NotificationListItem): boolean {
	if (tab === 'unread') return !notif.isRead;
	if (tab === 'system') return isSystemType(notif.type);
	return true;
}

function bumpStats(qc: ReturnType<typeof useQueryClient>, notif: NotificationListItem) {
	if (!notif.isRead) {
		adjustStatsCache(qc, 1, { system: isSystemType(notif.type) });
	}
	qc.invalidateQueries({ queryKey: CLIENT_NOTIFICATION_KEYS.stats() });
}
