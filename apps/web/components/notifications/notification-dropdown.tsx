'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Settings, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/use-notifications';
import { useMarkNotification } from '@/hooks/use-mark-notification';
import { useBulkNotifications } from '@/hooks/use-bulk-notifications';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import type { NotificationTab } from '@/lib/notifications/registry';

import { NotificationTabs } from './notification-tabs';
import { NotificationList } from './notification-list';

interface NotificationDropdownProps {
	onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
	const t = useTranslations('client.notifications');
	const [tab, setTab] = useState<NotificationTab>('all');

	const {
		notifications,
		isLoading,
		isFetching,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch
	} = useNotifications({ tab, limit: 15 });
	const stats = useNotificationStats();
	const { markRead, markUnread, markAllRead, isPending: isMarking } = useMarkNotification();
	const { deleteOne } = useBulkNotifications();

	const unreadCount = stats.data?.unread ?? 0;
	const counts = stats.data?.byTab;

	return (
		<div
			id="client-notifications-dropdown"
			role="dialog"
			aria-label={safeT(t, 'dropdown.aria.title', 'Notifications')}
			className="absolute right-0 top-12 z-50 w-[420px] max-w-[calc(100vw-1rem)] animate-in slide-in-from-top-2 fade-in duration-200"
		>
			<Card className="shadow-2xl border border-gray-200/80 dark:border-white/8 bg-background/98 backdrop-blur-sm overflow-hidden">
				<CardHeader className="pb-3 border-b border-gray-100 dark:border-white/8 bg-gray-50/50 dark:bg-white/2">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2.5 min-w-0">
							<CardTitle className="text-base font-semibold">
								{safeT(t, 'dropdown.title', 'Notifications')}
							</CardTitle>
							{unreadCount > 0 && (
								<Badge
									variant="secondary"
									className="px-2 py-0 h-5 text-xs font-medium rounded-md"
								>
									{unreadCount} {safeT(t, 'dropdown.newBadge', 'new')}
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-0.5 shrink-0">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => refetch()}
								className="h-7 w-7 p-0 rounded-md"
								disabled={isLoading || isFetching}
								aria-label={safeT(t, 'dropdown.refresh', 'Refresh notifications')}
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${isLoading || isFetching ? 'animate-spin' : ''}`}
								/>
							</Button>
							{unreadCount > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => markAllRead()}
									className="text-xs h-7 px-2.5 rounded-md font-medium"
									disabled={isMarking}
								>
									{safeT(t, 'dropdown.markAllRead', 'Mark all read')}
								</Button>
							)}
							<Link
								href="/client/notifications/preferences"
								onClick={onClose}
								aria-label={safeT(t, 'dropdown.aria.preferences', 'Notification preferences')}
								className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								<Settings className="h-3.5 w-3.5" />
							</Link>
							<Button
								variant="ghost"
								size="sm"
								onClick={onClose}
								className="h-7 w-7 p-0 rounded-md"
								aria-label={safeT(t, 'dropdown.close', 'Close notifications panel')}
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				</CardHeader>

				<NotificationTabs value={tab} onChange={setTab} counts={counts} variant="compact" />

				<CardContent className="p-0">
					<div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1">
						<NotificationList
							notifications={notifications}
							isLoading={isLoading}
							hasNextPage={hasNextPage}
							isFetchingNextPage={isFetchingNextPage}
							onLoadMore={() => fetchNextPage()}
							onMarkRead={markRead}
							onMarkUnread={markUnread}
							onDismiss={deleteOne}
							emptyVariant={tab}
							groupByDay={false}
						/>
					</div>

					{notifications.length > 0 && (
						<>
							<div className="border-t border-border/50" />
							<div className="px-3 py-2.5 bg-gray-50/50 dark:bg-white/2">
								<Link
									href="/client/notifications"
									onClick={onClose}
									className="block w-full text-center text-sm font-medium h-8 leading-8 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-accent/40 transition-colors"
								>
									{safeT(t, 'dropdown.seeAll', 'View all notifications')}
								</Link>
							</div>
						</>
					)}
				</CardContent>
			</Card>
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
