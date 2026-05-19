'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import {
	AlertCircle,
	Bell,
	CreditCard,
	ExternalLink,
	RefreshCw,
	Settings,
	UserPlus
} from 'lucide-react';

import { Container } from '@/components/ui/container';
import { AdminNotificationStats } from '@/components/admin/admin-notification-stats';
import { NotificationViewToggle, type NotificationView } from '@/components/notifications';
import { useAdminNotifications } from '@/hooks/use-admin-notifications';
import { cn } from '@/lib/utils';

/**
 * Admin notifications hub.
 *
 * Surfaces the full list of admin notifications + the stats grid that
 * was previously orphaned (admin-notification-stats.tsx).  Linked from
 * the admin bell's "View All Notifications" footer and from the
 * /client/notifications redirect that kicks in for admin sessions.
 */
export default function AdminNotificationsPage() {
	const t = useTranslations('admin.NOTIFICATIONS');
	const [view, setView] = useState<NotificationView>('list');
	const {
		notifications,
		stats,
		isLoading,
		isFetching,
		isMarkingAllAsRead,
		error,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
		handleNotificationClick,
		getNotificationLink
	} = useAdminNotifications();

	const unreadCount = stats?.unread ?? 0;

	return (
		<Container maxWidth="7xl" padding="default" className="py-6">
			<div className="space-y-6">
				<header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white tracking-tight">
								{safeT(t, 'TITLE', 'Notifications')}
							</h1>
							{unreadCount > 0 && (
								<span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold tabular-nums">
									{unreadCount > 99 ? '99+' : unreadCount}
								</span>
							)}
						</div>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{safeT(t, 'SUBTITLE', 'Submissions, reports and platform activity that need attention.')}
						</p>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={() => fetchNotifications()}
							disabled={isFetching}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/6 disabled:opacity-50 transition-colors"
							aria-label={safeT(t, 'REFRESH', 'Refresh notifications')}
						>
							<RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} aria-hidden="true" />
							<span className="hidden sm:inline">{safeT(t, 'REFRESH', 'Refresh')}</span>
						</button>
						<button
							type="button"
							onClick={() => markAllAsRead()}
							disabled={isMarkingAllAsRead || unreadCount === 0}
							className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg border border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/6 disabled:opacity-50 transition-colors"
						>
							{safeT(t, 'MARK_ALL_READ', 'Mark all read')}
						</button>
					</div>
				</header>

				<AdminNotificationStats />

				<div className="flex justify-end">
					<NotificationViewToggle value={view} onChange={setView} />
				</div>

				{error && (
					<div
						role="alert"
						className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-800/40"
					>
						<AlertCircle className="h-4 w-4 mt-px shrink-0" aria-hidden="true" />
						<span className="flex-1">{error}</span>
						<button
							type="button"
							onClick={() => fetchNotifications()}
							className="inline-flex items-center gap-1 h-6 px-2 -my-0.5 rounded-md font-medium border border-red-300 dark:border-red-800/60 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
						>
							<RefreshCw className="h-3 w-3" aria-hidden="true" />
							{safeT(t, 'TRY_AGAIN', 'Try Again')}
						</button>
					</div>
				)}

				<div
					className={cn(
						'rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden',
						view === 'grid' ? 'bg-gray-50/40 dark:bg-white/[0.015]' : 'bg-white dark:bg-white/[0.02]'
					)}
				>
					{isLoading ? (
						view === 'grid' ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
								{Array.from({ length: 6 }).map((_, i) => (
									<RowSkeleton key={i} view="grid" />
								))}
							</div>
						) : (
							<div className="divide-y divide-gray-100 dark:divide-white/8">
								{Array.from({ length: 5 }).map((_, i) => (
									<RowSkeleton key={i} view="list" />
								))}
							</div>
						)
					) : notifications.length === 0 ? (
						<EmptyState t={t} />
					) : view === 'grid' ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 sm:p-4">
							{notifications.map((n) => (
								<NotificationRow
									key={n.id}
									notification={n}
									onClick={() => handleNotificationClick(n)}
									onMarkRead={() => markAsRead(n.id)}
									link={getNotificationLink(n) ?? null}
									t={t}
									view="grid"
								/>
							))}
						</div>
					) : (
						<div className="divide-y divide-gray-100 dark:divide-white/8">
							{notifications.map((n) => (
								<NotificationRow
									key={n.id}
									notification={n}
									onClick={() => handleNotificationClick(n)}
									onMarkRead={() => markAsRead(n.id)}
									link={getNotificationLink(n) ?? null}
									t={t}
									view="list"
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</Container>
	);
}

interface AdminNotification {
	id: string;
	type: string;
	title: string;
	message: string;
	isRead: boolean;
	createdAt: string;
}

interface NotificationRowProps {
	notification: AdminNotification;
	onClick: () => void;
	onMarkRead: () => void;
	link: string | null;
	t: ReturnType<typeof useTranslations>;
	view?: NotificationView;
}

function NotificationRow({ notification, onClick, onMarkRead, link, t, view = 'list' }: NotificationRowProps) {
	const { type, title, message, isRead, createdAt } = notification;

	const sharedProps = {
		role: 'button' as const,
		tabIndex: 0,
		onClick,
		onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onClick();
			}
		}
	};

	const actions = (
		<>
			{link && (
				<a
					href={link}
					target="_blank"
					rel="noopener noreferrer"
					onClick={(e) => e.stopPropagation()}
					className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
				>
					<ExternalLink className="h-3 w-3" aria-hidden="true" />
					{safeT(t, 'VIEW_DETAILS', 'View')}
				</a>
			)}
			{!isRead && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onMarkRead();
					}}
					className="inline-flex items-center gap-1 h-6 px-2 text-[10px] font-medium rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
				>
					{safeT(t, 'MARK_READ', 'Mark read')}
				</button>
			)}
		</>
	);

	if (view === 'grid') {
		return (
			<div
				{...sharedProps}
				className={cn(
					'group/row relative flex flex-col gap-3 p-4 cursor-pointer',
					'rounded-xl border bg-white dark:bg-white/[0.02]',
					'transition-all duration-150',
					'hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:shadow-none',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500',
					isRead
						? 'border-gray-200 dark:border-white/8 hover:border-gray-300 dark:hover:border-white/12'
						: cn('border-gray-200 dark:border-white/10 ring-1 ring-inset', adminPriorityRing(type))
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="relative">
						{!isRead && (
							<span
								className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#0a0a0a]"
								aria-hidden="true"
							/>
						)}
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/6">
							{renderIcon(type)}
						</div>
					</div>
				</div>
				<div className="flex-1 min-w-0">
					<p
						className={cn(
							'text-sm leading-snug line-clamp-2',
							isRead
								? 'font-normal text-gray-700 dark:text-gray-300'
								: 'font-semibold text-gray-900 dark:text-white'
						)}
					>
						{title}
					</p>
					<p
						className={cn(
							'mt-1 line-clamp-3 text-xs leading-relaxed',
							isRead ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'
						)}
					>
						{message}
					</p>
				</div>
				<div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
					<span className="inline-flex items-center rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 px-1.5 h-5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
						{typeLabel(type, t)}
					</span>
					<time className="text-[11px] font-medium text-gray-500 tabular-nums whitespace-nowrap">
						{formatDistanceToNow(new Date(createdAt), { addSuffix: false })}
					</time>
				</div>
				<div
					className={cn(
						'absolute bottom-3 left-4 flex items-center gap-1',
						'opacity-0 -translate-y-1 transition-all duration-150',
						'group-hover/row:opacity-100 group-hover/row:translate-y-0',
						'group-focus-within/row:opacity-100 group-focus-within/row:translate-y-0',
						'motion-reduce:opacity-100 motion-reduce:translate-y-0'
					)}
				>
					{actions}
				</div>
			</div>
		);
	}

	return (
		<div
			{...sharedProps}
			className={cn(
				'group/row relative flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 border-l-[3px]',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-inset',
				isRead
					? 'border-transparent hover:bg-gray-50 dark:hover:bg-white/3'
					: cn(priorityBorder(type), 'bg-primary/[0.03] hover:bg-primary/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/4')
			)}
		>
			<div className="relative shrink-0 pt-0.5">
				{!isRead && (
					<span
						className="absolute -left-1 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-white dark:ring-[#0a0a0a]"
						aria-hidden="true"
					/>
				)}
				<div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-white/6">
					{renderIcon(type)}
				</div>
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<p
							className={cn(
								'text-sm leading-snug',
								isRead
									? 'font-normal text-gray-700 dark:text-gray-300'
									: 'font-semibold text-gray-900 dark:text-white'
							)}
						>
							{title}
						</p>
						<p
							className={cn(
								'mt-0.5 line-clamp-2 text-xs leading-relaxed',
								isRead ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'
							)}
						>
							{message}
						</p>
					</div>
					<time className="shrink-0 text-[11px] font-medium text-gray-500 tabular-nums whitespace-nowrap">
						{formatDistanceToNow(new Date(createdAt), { addSuffix: false })}
					</time>
				</div>

				<div className="mt-2 flex items-center justify-between gap-2">
					<span className="inline-flex items-center rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 px-1.5 h-5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
						{typeLabel(type, t)}
					</span>
					<div
						className={cn(
							'flex items-center gap-1 opacity-0 transition-opacity duration-150',
							'group-hover/row:opacity-100 group-focus-within/row:opacity-100',
							'motion-reduce:opacity-100'
						)}
					>
						{actions}
					</div>
				</div>
			</div>
		</div>
	);
}

function RowSkeleton({ view = 'list' }: { view?: NotificationView }) {
	if (view === 'grid') {
		return (
			<div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.02] animate-pulse">
				<div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/8" />
				<div className="space-y-1.5">
					<div className="h-3.5 w-3/4 bg-gray-100 dark:bg-white/8 rounded" />
					<div className="h-3 w-full bg-gray-100 dark:bg-white/8 rounded" />
					<div className="h-3 w-5/6 bg-gray-100 dark:bg-white/8 rounded" />
				</div>
				<div className="h-5 w-20 bg-gray-100 dark:bg-white/8 rounded-md" />
			</div>
		);
	}
	return (
		<div className="flex gap-3 px-4 py-3 border-l-[3px] border-transparent animate-pulse">
			<div className="h-9 w-9 shrink-0 rounded-full bg-gray-100 dark:bg-white/8" />
			<div className="flex-1 min-w-0 space-y-2">
				<div className="h-3.5 w-2/3 bg-gray-100 dark:bg-white/8 rounded" />
				<div className="h-3 w-full bg-gray-100 dark:bg-white/8 rounded" />
				<div className="h-5 w-20 bg-gray-100 dark:bg-white/8 rounded-md" />
			</div>
		</div>
	);
}

function adminPriorityRing(type: string): string {
	switch (type) {
		case 'payment_failed':
		case 'system_alert':
			return 'ring-red-500/40';
		case 'comment_reported':
			return 'ring-amber-500/40';
		case 'item_submission':
			return 'ring-blue-500/30';
		default:
			return 'ring-gray-300/40 dark:ring-white/8';
	}
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations> }) {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
			<div className="relative mb-4">
				<div className="absolute inset-0 -m-3 rounded-full bg-gray-100 dark:bg-white/4 blur-md" aria-hidden="true" />
				<div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/6 ring-1 ring-gray-200 dark:ring-white/8">
					<Bell className="h-5 w-5 text-gray-500" aria-hidden="true" />
				</div>
			</div>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
				{safeT(t, 'NO_NOTIFICATIONS', 'No notifications')}
			</h3>
			<p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
				{safeT(t, 'ALL_CAUGHT_UP', "You're all caught up! New notifications will appear here.")}
			</p>
		</div>
	);
}

function renderIcon(type: string) {
	const cls = 'h-4 w-4';
	switch (type) {
		case 'item_submission':
			return <ExternalLink className={`${cls} text-blue-500`} aria-hidden="true" />;
		case 'comment_reported':
			return <AlertCircle className={`${cls} text-orange-500`} aria-hidden="true" />;
		case 'user_registered':
			return <UserPlus className={`${cls} text-emerald-500`} aria-hidden="true" />;
		case 'payment_failed':
			return <CreditCard className={`${cls} text-red-500`} aria-hidden="true" />;
		case 'system_alert':
			return <Settings className={`${cls} text-violet-500`} aria-hidden="true" />;
		default:
			return <Bell className={`${cls} text-gray-500`} aria-hidden="true" />;
	}
}

function priorityBorder(type: string): string {
	switch (type) {
		case 'payment_failed':
		case 'system_alert':
			return 'border-red-500';
		case 'comment_reported':
			return 'border-orange-500';
		case 'item_submission':
			return 'border-blue-500';
		case 'user_registered':
			return 'border-emerald-500';
		default:
			return 'border-gray-300 dark:border-white/10';
	}
}

function typeLabel(type: string, t: ReturnType<typeof useTranslations>): string {
	switch (type) {
		case 'item_submission':
			return safeT(t, 'NOTIFICATION_TYPES.NEW_SUBMISSION', 'New submission');
		case 'comment_reported':
			return safeT(t, 'NOTIFICATION_TYPES.REPORTED_COMMENT', 'Reported comment');
		case 'user_registered':
			return safeT(t, 'NOTIFICATION_TYPES.NEW_USER', 'New user');
		case 'payment_failed':
			return safeT(t, 'NOTIFICATION_TYPES.PAYMENT_ISSUE', 'Payment issue');
		case 'system_alert':
			return safeT(t, 'NOTIFICATION_TYPES.SYSTEM_ALERT', 'System alert');
		default:
			return safeT(t, 'NOTIFICATION_TYPES.NOTIFICATION', 'Notification');
	}
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
