'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { NotificationListItem } from '@/lib/notifications/types';
import type { NotificationTab } from '@/lib/notifications/registry';
import { cn } from '@/lib/utils';

import { NotificationCard } from './notification-card';
import { NotificationListSkeleton } from './notification-card-skeleton';
import { NotificationEmpty } from './notification-empty';
import { sectionByDay, type DaySection } from './group-utils';

interface NotificationListProps {
	notifications: NotificationListItem[];
	isLoading?: boolean;
	isFetchingNextPage?: boolean;
	hasNextPage?: boolean;
	onLoadMore?: () => void;
	onMarkRead?: (id: string) => void;
	onMarkUnread?: (id: string) => void;
	onDismiss?: (id: string) => void;
	emptyVariant?: NotificationTab;
	selectable?: boolean;
	selectedIds?: Set<string>;
	onSelectChange?: (id: string, selected: boolean) => void;
	groupByDay?: boolean;
	/** "list" (default) renders divide-y rows; "grid" renders a responsive tile grid. */
	view?: 'list' | 'grid';
	className?: string;
}

const SECTION_LABEL_KEY: Record<DaySection, string> = {
	today: 'today',
	yesterday: 'yesterday',
	thisWeek: 'thisWeek',
	earlier: 'earlier'
};

const FALLBACK_LABELS: Record<DaySection, string> = {
	today: 'Today',
	yesterday: 'Yesterday',
	thisWeek: 'This week',
	earlier: 'Earlier'
};

export function NotificationList({
	notifications,
	isLoading,
	isFetchingNextPage,
	hasNextPage,
	onLoadMore,
	onMarkRead,
	onMarkUnread,
	onDismiss,
	emptyVariant = 'all',
	selectable,
	selectedIds,
	onSelectChange,
	groupByDay = false,
	view = 'list',
	className
}: NotificationListProps) {
	const t = useTranslations('client.notifications.sections');
	const sentinelRef = useRef<HTMLDivElement | null>(null);
	const listRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!onLoadMore || !hasNextPage) return;
		const node = sentinelRef.current;
		if (!node) return;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) onLoadMore();
			}
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, [onLoadMore, hasNextPage, notifications.length]);

	/** Arrow-key navigation between rows when focus is inside the list. */
	const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement | null;
		if (!target?.hasAttribute('data-notification-id')) return;
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		event.preventDefault();
		const root = listRef.current;
		if (!root) return;
		const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-notification-id]'));
		const idx = rows.indexOf(target);
		if (idx === -1) return;
		const next = event.key === 'ArrowDown' ? rows[idx + 1] : rows[idx - 1];
		next?.focus();
	}, []);

	if (isLoading) {
		return <NotificationListSkeleton rows={view === 'grid' ? 6 : 6} view={view} />;
	}

	if (notifications.length === 0) {
		return <NotificationEmpty variant={emptyVariant} />;
	}

	const renderRow = (n: NotificationListItem) => (
		<div
			key={n.id}
			className="animate-in fade-in slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
		>
			<NotificationCard
				notification={n}
				onMarkRead={onMarkRead}
				onMarkUnread={onMarkUnread}
				onDismiss={onDismiss}
				selectable={selectable}
				selected={selectedIds?.has(n.id)}
				onSelectChange={onSelectChange}
				view={view}
			/>
		</div>
	);

	const gridContainerClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4';
	const listContainerClass = 'divide-y divide-gray-100 dark:divide-white/8';
	const Loader = () =>
		hasNextPage ? (
			<div
				ref={sentinelRef}
				className="flex items-center justify-center px-4 py-3 text-[11px] text-gray-500 dark:text-gray-500"
			>
				{isFetchingNextPage && (
					<span className="inline-flex items-center gap-1.5">
						<span className="inline-block h-1 w-1 rounded-full bg-gray-400 animate-pulse" />
						<span className="inline-block h-1 w-1 rounded-full bg-gray-400 animate-pulse [animation-delay:150ms]" />
						<span className="inline-block h-1 w-1 rounded-full bg-gray-400 animate-pulse [animation-delay:300ms]" />
					</span>
				)}
			</div>
		) : null;

	// Day grouping is only meaningful for the list view — grid uses a
	// flat tile mosaic.  When view=grid and groupByDay=true we render
	// section headers above each tile bucket.
	if (!groupByDay || view === 'grid') {
		if (view === 'grid' && groupByDay) {
			const sections = sectionByDay(notifications);
			return (
				<div ref={listRef} onKeyDown={handleKeyDown} className={cn(className)}>
					{sections.map((section, sectionIdx) => (
						<section
							key={section.key}
							className={cn(sectionIdx > 0 && 'border-t border-gray-100 dark:border-white/8')}
						>
							<div className="sticky top-0 z-[1] px-4 py-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/8">
								<h3 className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
									<span>{safeT(t, SECTION_LABEL_KEY[section.key], FALLBACK_LABELS[section.key])}</span>
									<span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-100 dark:bg-white/8 px-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 tabular-nums normal-case">
										{section.notifications.length}
									</span>
								</h3>
							</div>
							<div className={gridContainerClass}>{section.notifications.map(renderRow)}</div>
						</section>
					))}
					<Loader />
				</div>
			);
		}
		return (
			<div ref={listRef} onKeyDown={handleKeyDown} className={className}>
				<div className={view === 'grid' ? gridContainerClass : listContainerClass}>
					{notifications.map(renderRow)}
				</div>
				<Loader />
			</div>
		);
	}

	const sections = sectionByDay(notifications);
	return (
		<div ref={listRef} onKeyDown={handleKeyDown} className={cn(className)}>
			{sections.map((section, sectionIdx) => (
				<section key={section.key} className={cn(sectionIdx > 0 && 'border-t border-gray-100 dark:border-white/8')}>
					<div className="sticky top-0 z-[1] px-4 py-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/8">
						<h3 className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							<span>{safeT(t, SECTION_LABEL_KEY[section.key], FALLBACK_LABELS[section.key])}</span>
							<span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-100 dark:bg-white/8 px-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 tabular-nums normal-case">
								{section.notifications.length}
							</span>
						</h3>
					</div>
					<div className={listContainerClass}>{section.notifications.map(renderRow)}</div>
				</section>
			))}
			<Loader />
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
