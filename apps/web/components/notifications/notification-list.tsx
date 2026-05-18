'use client';

import { useEffect, useRef } from 'react';
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
	groupByDay = true,
	className
}: NotificationListProps) {
	const t = useTranslations('client.notifications.sections');
	const sentinelRef = useRef<HTMLDivElement | null>(null);

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

	if (isLoading) {
		return <NotificationListSkeleton rows={5} />;
	}

	if (notifications.length === 0) {
		return <NotificationEmpty variant={emptyVariant} />;
	}

	const sections = groupByDay ? sectionByDay(notifications) : [{ key: 'today' as DaySection, notifications }];

	return (
		<div role="list" className={cn('flex flex-col', className)}>
			{sections.map((section) => (
				<section key={section.key} className="flex flex-col gap-0.5 px-1 py-1">
					<h3 className="px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
						{safeT(t, SECTION_LABEL_KEY[section.key], FALLBACK_LABELS[section.key])}
					</h3>
					{section.notifications.map((n) => (
						<NotificationCard
							key={n.id}
							notification={n}
							onMarkRead={onMarkRead}
							onMarkUnread={onMarkUnread}
							onDismiss={onDismiss}
							selectable={selectable}
							selected={selectedIds?.has(n.id)}
							onSelectChange={onSelectChange}
						/>
					))}
				</section>
			))}

			{hasNextPage && (
				<div ref={sentinelRef} className="px-3 py-4 text-center text-xs text-muted-foreground">
					{isFetchingNextPage ? '…' : ''}
				</div>
			)}
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
