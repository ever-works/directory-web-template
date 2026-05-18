'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { useMarkNotification } from '@/hooks/use-mark-notification';
import { useBulkNotifications } from '@/hooks/use-bulk-notifications';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import type { NotificationTab } from '@/lib/notifications/registry';

import { NotificationTabs } from './notification-tabs';
import { NotificationList } from './notification-list';

interface NotificationDropdownProps {
	onClose: () => void;
	className?: string;
}

export function NotificationDropdown({ onClose, className }: NotificationDropdownProps) {
	const t = useTranslations('client.notifications.dropdown');
	const [tab, setTab] = useState<NotificationTab>('all');
	const containerRef = useRef<HTMLDivElement>(null);

	const {
		notifications,
		isLoading,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage
	} = useNotifications({ tab, limit: 15 });
	const stats = useNotificationStats();
	const { markRead, markUnread, markAllRead, isPending: markPending } = useMarkNotification();
	const { deleteOne, isPending: deletePending } = useBulkNotifications();

	useEffect(() => {
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [onClose]);

	const counts = stats.data?.byTab;

	return (
		<div
			ref={containerRef}
			role="dialog"
			aria-label={safeT(t, 'aria.title', 'Notifications')}
			className={cn(
				'absolute right-0 top-full z-50 mt-2 flex w-[380px] max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
				className
			)}
		>
			<header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
				<h2 className="text-sm font-semibold">{safeT(t, 'title', 'Notifications')}</h2>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={() => markAllRead()}
						disabled={markPending || (stats.data?.unread ?? 0) === 0}
					>
						{safeT(t, 'markAllRead', 'Mark all read')}
					</Button>
					<Link
						href="/client/notifications/preferences"
						onClick={onClose}
						aria-label={safeT(t, 'aria.preferences', 'Notification preferences')}
						className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
					>
						<Settings className="h-3.5 w-3.5" />
					</Link>
				</div>
			</header>

			<NotificationTabs value={tab} onChange={setTab} counts={counts} />

			<div className="max-h-[420px] overflow-y-auto">
				<NotificationList
					notifications={notifications}
					isLoading={isLoading}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					onLoadMore={() => fetchNextPage()}
					onMarkRead={markRead}
					onMarkUnread={markUnread}
					onDismiss={(id) => deleteOne(id)}
					emptyVariant={tab}
				/>
				{deletePending && <div className="px-3 py-1 text-[11px] text-muted-foreground">…</div>}
			</div>

			<footer className="border-t border-border px-3 py-2 text-center">
				<Link
					href="/client/notifications"
					onClick={onClose}
					className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'h-auto p-0 text-xs')}
				>
					{safeT(t, 'seeAll', 'See all notifications')}
				</Link>
			</footer>
		</div>
	);
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
