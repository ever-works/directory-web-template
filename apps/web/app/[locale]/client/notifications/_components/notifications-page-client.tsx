'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Settings } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import { useMarkNotification } from '@/hooks/use-mark-notification';
import { useBulkNotifications } from '@/hooks/use-bulk-notifications';
import {
	NotificationTabs,
	NotificationList,
	NotificationFilters,
	NotificationBulkActions,
	type NotificationFiltersState
} from '@/components/notifications';
import type { NotificationTab } from '@/lib/notifications/registry';
import type { BulkAction } from '@/lib/notifications/types';

export function NotificationsPageClient() {
	const t = useTranslations('client.notifications');

	const [tab, setTab] = useState<NotificationTab>('all');
	const [filters, setFilters] = useState<NotificationFiltersState>({
		q: '',
		types: [],
		priorities: [],
		dateFrom: null,
		dateTo: null
	});
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const listFilters = useMemo(
		() => ({
			tab,
			q: filters.q || undefined,
			type: filters.types.length > 0 ? filters.types : undefined,
			priority: filters.priorities.length > 0 ? filters.priorities : undefined,
			dateFrom: filters.dateFrom ?? undefined,
			dateTo: filters.dateTo ?? undefined,
			limit: 30
		}),
		[tab, filters]
	);

	const {
		notifications,
		isLoading,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage
	} = useNotifications(listFilters);
	const stats = useNotificationStats();
	const { markRead, markUnread, markAllRead, isPending: markPending } = useMarkNotification();
	const { bulkAction, deleteOne, isPending: bulkPending } = useBulkNotifications();

	const counts = stats.data?.byTab;

	const onSelectChange = (id: string, selected: boolean) => {
		setSelectedIds((curr) => {
			const next = new Set(curr);
			if (selected) next.add(id);
			else next.delete(id);
			return next;
		});
	};

	const runBulk = (action: BulkAction) => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;
		bulkAction({ ids, action });
		setSelectedIds(new Set());
	};

	return (
		<div className="flex flex-col gap-4">
			<header className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">{safeT(t, 'pageTitle', 'Notifications')}</h1>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => markAllRead()}
						disabled={markPending || (stats.data?.unread ?? 0) === 0}
					>
						{safeT(t, 'dropdown.markAllRead', 'Mark all read')}
					</Button>
					<Link
						href="/client/notifications/preferences"
						className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex items-center gap-1')}
					>
						<Settings className="h-3.5 w-3.5" />
						{safeT(t, 'preferences.cta', 'Preferences')}
					</Link>
				</div>
			</header>

			<NotificationTabs value={tab} onChange={setTab} counts={counts} />
			<NotificationFilters value={filters} onChange={setFilters} />
			<NotificationBulkActions
				selectedCount={selectedIds.size}
				onAction={runBulk}
				onClear={() => setSelectedIds(new Set())}
				disabled={bulkPending}
			/>

			<div className="rounded-md border border-border bg-card">
				<NotificationList
					notifications={notifications}
					isLoading={isLoading}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					onLoadMore={() => fetchNextPage()}
					onMarkRead={markRead}
					onMarkUnread={markUnread}
					onDismiss={deleteOne}
					selectable
					selectedIds={selectedIds}
					onSelectChange={onSelectChange}
					emptyVariant={tab}
				/>
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
