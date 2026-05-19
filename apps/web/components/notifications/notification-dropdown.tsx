'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Settings, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
			className={cn(
				'absolute right-0 top-12 z-50',
				'w-[420px] max-w-[calc(100vw-1rem)]',
				'rounded-2xl overflow-hidden',
				'bg-white dark:bg-[#141414]',
				'ring-1 ring-black/5 dark:ring-white/10',
				'shadow-2xl shadow-black/10 dark:shadow-black/40',
				'animate-in slide-in-from-top-2 fade-in duration-300'
			)}
		>
			<div className="flex flex-col">
				{/* Header */}
				<div className="px-4 pt-3.5 pb-3 border-b border-gray-100 dark:border-white/8">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2.5 min-w-0">
							<h3 className="text-[13px] font-semibold text-gray-900 dark:text-white">
								{safeT(t, 'dropdown.title', 'Notifications')}
							</h3>
							{unreadCount > 0 && (
								<Badge
									variant="secondary"
									className="px-2 py-0 h-5 text-[10px] font-medium rounded-md"
								>
									{unreadCount} {safeT(t, 'dropdown.newBadge', 'new')}
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-0.5 shrink-0">
							<button
								onClick={() => refetch()}
								className="h-7 cursor-pointer w-7 p-0 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
								disabled={isLoading || isFetching}
								aria-label={safeT(t, 'dropdown.refresh', 'Refresh notifications')}
							>
								<RefreshCw
									className={cn('h-3.5 w-3.5', (isLoading || isFetching) && 'animate-spin')}
								/>
							</button>
							{unreadCount > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => markAllRead()}
									className="text-[11px] h-7 px-2.5 rounded-md font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
									disabled={isMarking}
								>
									{safeT(t, 'dropdown.markAllRead', 'Mark all read')}
								</Button>
							)}
							<Link
								href="/client/notifications/preferences"
								onClick={onClose}
								aria-label={safeT(t, 'dropdown.aria.preferences', 'Notification preferences')}
								className="inline-flex items-center justify-center h-7 w-7 mr-3 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
							>
								<Settings className="h-3.5 w-3.5" />
							</Link>
							<button
								onClick={onClose}
								className="h-5 w-5 cursor-pointer p-0 border-none rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
								aria-label={safeT(t, 'dropdown.close', 'Close notifications panel')}
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</div>

				<NotificationTabs value={tab} onChange={setTab} counts={counts} variant="compact" />

				{/* Scrollable list */}
				<div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:w-1">
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

				{/* Footer */}
				{notifications.length > 0 && (
					<div className="border-t border-gray-100 dark:border-white/8 px-3 py-2">
						<Link
							href="/client/notifications"
							onClick={onClose}
							className={cn(
								'flex items-center justify-center w-full h-8 rounded-lg',
								'text-[13px] font-medium',
								'text-gray-500 dark:text-gray-400',
								'hover:text-gray-900 dark:hover:text-white',
								'hover:bg-gray-100 dark:hover:bg-white/6',
								'transition-colors duration-150'
							)}
						>
							{safeT(t, 'dropdown.seeAll', 'View all notifications')}
						</Link>
					</div>
				)}
			</div>
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
