'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Settings } from 'lucide-react';

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
		isFetching,
		isError,
		error,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch
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

	const errorMessage =
		isError && error instanceof Error
			? error.message
			: isError
				? safeT(t, 'errors.generic', 'Failed to load notifications')
				: null;

	return (
		<div>
			{errorMessage && (
				<div
					role="alert"
					className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-800/40"
				>
					<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span>{errorMessage}</span>
				</div>
			)}

			<header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
						{safeT(t, 'pageTitle', 'Notifications')}
					</h1>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
						{safeT(t, 'pageSubtitle', 'All activity for your account.')}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={() => refetch()}
						disabled={isFetching}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 disabled:opacity-50 transition-colors"
						aria-label={safeT(t, 'dropdown.refresh', 'Refresh')}
					>
						<RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
						<span>{safeT(t, 'refresh', 'Refresh')}</span>
					</button>
					<button
						type="button"
						onClick={() => markAllRead()}
						disabled={markPending || (stats.data?.unread ?? 0) === 0}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 disabled:opacity-50 transition-colors"
					>
						{safeT(t, 'dropdown.markAllRead', 'Mark all read')}
					</button>
					<Link
						href="/client/notifications/preferences"
						className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
					>
						<Settings className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">{safeT(t, 'preferences.cta', 'Preferences')}</span>
					</Link>
				</div>
			</header>

			<NotificationTabs value={tab} onChange={setTab} counts={counts} />

			<div className="mb-4">
				<NotificationFilters value={filters} onChange={setFilters} />
			</div>

			{selectedIds.size > 0 && (
				<div className="mb-4">
					<NotificationBulkActions
						selectedCount={selectedIds.size}
						onAction={runBulk}
						onClear={() => setSelectedIds(new Set())}
						disabled={bulkPending}
					/>
				</div>
			)}

			<div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3 overflow-hidden">
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
					groupByDay
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
