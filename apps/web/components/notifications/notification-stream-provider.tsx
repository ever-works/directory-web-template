'use client';

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { useNotificationStream } from '@/hooks/use-notification-stream';

interface NotificationStreamContextValue {
	announcement: string | null;
}

const NotificationStreamContext = createContext<NotificationStreamContextValue>({ announcement: null });

interface NotificationStreamProviderProps {
	enabled: boolean;
	children: ReactNode;
}

/**
 * Subscribes to /api/client/notifications/stream when `enabled`,
 * pushes incoming events into TanStack Query cache, and exposes a
 * throttled aria-live announcement string for screen readers.
 */
export function NotificationStreamProvider({ enabled, children }: NotificationStreamProviderProps) {
	const [announcement, setAnnouncement] = useState<string | null>(null);
	const lastAnnouncedAt = useRef<number>(0);

	useNotificationStream({
		enabled,
		onIncoming: (n) => {
			const now = Date.now();
			if (now - lastAnnouncedAt.current < 5000) return;
			lastAnnouncedAt.current = now;
			setAnnouncement(n.title);
		}
	});

	const value = useMemo(() => ({ announcement }), [announcement]);

	return (
		<NotificationStreamContext.Provider value={value}>
			{children}
			<div role="status" aria-live="polite" aria-atomic="false" className="sr-only">
				{announcement}
			</div>
		</NotificationStreamContext.Provider>
	);
}

export function useNotificationAnnouncement() {
	return useContext(NotificationStreamContext);
}
