'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { NotificationListItem } from '@/lib/notifications/types';

import { NotificationIcon } from './icon-map';

export type NotificationCardView = 'list' | 'grid';

interface NotificationCardProps {
	notification: NotificationListItem;
	onMarkRead?: (id: string) => void;
	onMarkUnread?: (id: string) => void;
	onDismiss?: (id: string) => void;
	onSelectChange?: (id: string, selected: boolean) => void;
	selected?: boolean;
	selectable?: boolean;
	view?: NotificationCardView;
}

/**
 * Spec 027 v4 — notification row / tile.
 *
 * - `view="list"` (default): full-width row with subtle unread tint.
 *   Icon sits in a rounded square, hover reveals contextual actions.
 * - `view="grid"`: compact tile — icon + title share the header row,
 *   message below, footer fades type pill → actions on hover.
 */
export function NotificationCard({
	notification,
	onMarkRead,
	onMarkUnread,
	onDismiss,
	onSelectChange,
	selected,
	selectable,
	view = 'list'
}: NotificationCardProps) {
	const router = useRouter();
	const t = useTranslations('client.notifications.types');
	const tActions = useTranslations('client.notifications.actions');
	const { id, type, category, priority, title, message, data, isRead, createdAt } = notification;
	const actionUrl = resolveActionUrl(type, data);

	const handleNavigate = () => {
		if (!isRead) onMarkRead?.(id);
		if (actionUrl) router.push(actionUrl);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleNavigate();
		}
	};

	const typeLabel = safeT(t, type, humanise(type));
	const createdAtDate = new Date(createdAt);
	const relativeTime = formatDistanceToNow(createdAtDate, { addSuffix: false });
	const absoluteTime = format(createdAtDate, 'PPpp');
	const shortRel = shortRelative(relativeTime);

	const sharedRowProps = {
		role: 'button' as const,
		tabIndex: 0,
		'aria-label': `${typeLabel}: ${title || message}`,
		'data-notification-id': id,
		'data-notification-state': isRead ? 'read' : 'unread',
		onClick: handleNavigate,
		onKeyDown: handleKeyDown
	};

	// Only surface critical priority — lower levels add visual noise.
	const criticalDot =
		priority === 'critical' ? (
			<span
				className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 self-center"
				aria-label={safeT(tActions, 'criticalLabel', 'Critical')}
			/>
		) : null;

	const actions = (
		<>
			{actionUrl && (
				<RowAction
					label={safeT(tActions, 'open', 'Open')}
					onClick={(e) => {
						e.stopPropagation();
						router.push(actionUrl);
					}}
				>
					<ExternalLink className="h-3 w-3" aria-hidden="true" />
				</RowAction>
			)}
			<RowAction
				label={
					isRead
						? safeT(tActions, 'markUnread', 'Mark as unread')
						: safeT(tActions, 'markRead', 'Mark as read')
				}
				onClick={(e) => {
					e.stopPropagation();
					if (isRead) onMarkUnread?.(id);
					else onMarkRead?.(id);
				}}
			>
				<Check className={cn('h-3 w-3', isRead && 'opacity-40')} aria-hidden="true" />
			</RowAction>
			{onDismiss && (
				<RowAction
					label={safeT(tActions, 'dismiss', 'Dismiss notification')}
					onClick={(e) => {
						e.stopPropagation();
						onDismiss(id);
					}}
					variant="dismiss"
				>
					<X className="h-3 w-3" aria-hidden="true" />
				</RowAction>
			)}
		</>
	);

	// ──────────────── Grid variant ────────────────
	if (view === 'grid') {
		return (
			<div
				{...sharedRowProps}
				className={cn(
					'group/row relative flex h-full min-h-[180px] flex-col gap-2.5 p-4 cursor-pointer',
					'rounded-xl border border-gray-200 dark:border-white/12 bg-white dark:bg-white/8',
					'transition-all duration-200',
					'hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:shadow-none',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500',
					!isRead && 'shadow-sm'
				)}
			>
				{selectable && (
					<input
						type="checkbox"
						checked={selected ?? false}
						onClick={(e) => e.stopPropagation()}
						onChange={(e) => onSelectChange?.(id, e.target.checked)}
						aria-label={isRead ? 'Select read notification' : 'Select unread notification'}
						className="absolute top-3 right-3 h-3.5 w-3.5 cursor-pointer rounded accent-neutral-900 dark:accent-white"
					/>
				)}

				{/* Header: icon + title in one row */}
				<div className="flex items-start gap-3">
					<div className="relative shrink-0">
						{!isRead && (
							<span
								className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-[#0a0a0a]"
								aria-hidden="true"
							/>
						)}
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/6 transition-transform duration-200 group-hover/row:scale-105">
							<NotificationIcon type={type} category={category} />
						</div>
					</div>

					<div className="flex-1 min-w-0 pt-0.5">
						<div className="flex items-center gap-1.5">
							<p
								className={cn(
									'flex-1 min-w-0 text-[13px] leading-snug line-clamp-2',
									isRead
										? 'font-normal text-gray-700 dark:text-gray-300'
										: 'font-semibold text-gray-900 dark:text-white'
								)}
							>
								{title}
							</p>
							{criticalDot}
						</div>
					</div>
				</div>

				{/* Message */}
				<p
					className={cn(
						'flex-1 line-clamp-3 text-xs leading-relaxed',
						isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
					)}
				>
					{message}
				</p>

				{/* Footer: type pill ↔ actions swap on hover (desktop); both
				    visible on touch since there's no hover to reveal actions. */}
				<div className="relative mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/8">
					<span
						className={cn(
							'hidden items-center rounded-md bg-gray-100 dark:bg-white/6 px-1.5 h-5 text-[10px] font-medium text-gray-600 dark:text-gray-400',
							'sm:inline-flex transition-opacity duration-150 sm:group-hover/row:opacity-0 motion-reduce:opacity-100'
						)}
					>
						{typeLabel}
					</span>

					<div
						className={cn(
							'flex items-center gap-0.5',
							'opacity-100 sm:absolute sm:left-0 sm:opacity-0 transition-opacity duration-150',
							'sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100',
							'group-focus-within/row:opacity-100 motion-reduce:opacity-100'
						)}
					>
						{actions}
					</div>

					<time
						dateTime={createdAt}
						title={absoluteTime}
						className="text-[11px] text-gray-500 dark:text-gray-500 tabular-nums whitespace-nowrap shrink-0"
					>
						{shortRel}
					</time>
				</div>
			</div>
		);
	}

	// ──────────────── List variant (default) ────────────────
	return (
		<div
			{...sharedRowProps}
			className={cn(
				'group/row relative flex gap-3 px-4 py-3 cursor-pointer',
				'transition-colors duration-150',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-inset',
				isRead
					? 'hover:bg-gray-50 dark:hover:bg-white/3'
					: 'bg-primary/3 hover:bg-primary/6 dark:bg-white/2 dark:hover:bg-white/4'
			)}
		>
			{selectable && (
				<div className="flex items-start pt-1.5">
					<input
						type="checkbox"
						checked={selected ?? false}
						onClick={(e) => e.stopPropagation()}
						onChange={(e) => onSelectChange?.(id, e.target.checked)}
						aria-label={isRead ? 'Select read notification' : 'Select unread notification'}
						className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-neutral-900 dark:accent-white"
					/>
				</div>
			)}

			{/* Icon with unread dot */}
			<div className="relative shrink-0 pt-0.5">
				{!isRead && (
					<span
						className="absolute -left-1 top-2 h-1.5 w-1.5 rounded-full bg-primary"
						aria-hidden="true"
					/>
				)}
				<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/6 transition-transform duration-200 group-hover/row:scale-105">
					<NotificationIcon type={type} category={category} />
				</div>
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							<p
								className={cn(
									'text-[13px] leading-snug truncate',
									isRead
										? 'font-normal text-gray-700 dark:text-gray-300'
										: 'font-semibold text-gray-900 dark:text-white'
								)}
							>
								{title}
							</p>
							{criticalDot}
						</div>
						<p
							className={cn(
								'mt-0.5 line-clamp-2 text-xs leading-relaxed',
								isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
							)}
						>
							{message}
						</p>
					</div>

					<time
						dateTime={createdAt}
						title={absoluteTime}
						className="shrink-0 text-[11px] text-gray-500 dark:text-gray-500 tabular-nums whitespace-nowrap mt-0.5"
					>
						{shortRel}
					</time>
				</div>

				{/* Meta row: type pill left, actions right */}
				<div className="mt-1.5 flex items-center justify-between gap-2">
					<span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-white/6 px-1.5 h-4 text-[10px] font-medium text-gray-600 dark:text-gray-400">
						{typeLabel}
					</span>

					<div
						className={cn(
							'flex items-center gap-0.5 shrink-0',
							// Hover-only reveal would leave touch users with no way to
							// see (or reach) these actions, so they stay visible by
							// default and only fade in on hover for pointer devices.
							'opacity-100 sm:opacity-0 transition-opacity duration-150',
							'sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100',
							'group-focus-within/row:opacity-100 motion-reduce:opacity-100'
						)}
					>
						{actions}
					</div>
				</div>
			</div>
		</div>
	);
}

interface RowActionProps {
	label: string;
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	variant?: 'default' | 'dismiss';
	children: React.ReactNode;
}

function RowAction({ label, onClick, variant = 'default', children }: RowActionProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className={cn(
				'inline-flex items-center justify-center h-6 w-6 rounded-md',
				'transition-colors duration-150',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500',
				variant === 'dismiss'
					? 'text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400'
					: 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white'
			)}
		>
			{children}
		</button>
	);
}

function shortRelative(input: string): string {
	const lower = input.toLowerCase();
	if (/less than a minute/.test(lower)) return 'now';
	const map: Array<[RegExp, string]> = [
		[/(\d+)\s+seconds?/, '$1s'],
		[/(\d+)\s+minutes?/, '$1m'],
		[/(\d+)\s+hours?/, '$1h'],
		[/(\d+)\s+days?/, '$1d'],
		[/(\d+)\s+weeks?/, '$1w'],
		[/(\d+)\s+months?/, '$1mo'],
		[/(\d+)\s+years?/, '$1y'],
		[/about an? hour/, '1h'],
		[/about a day/, '1d'],
		[/a minute/, '1m'],
		[/a second/, '1s'],
		[/a day/, '1d'],
		[/a month/, '1mo'],
		[/a year/, '1y']
	];
	for (const [re, repl] of map) {
		if (re.test(lower)) return lower.replace(re, repl).replace('about ', '').replace(' ago', '').trim();
	}
	return input;
}

/**
 * Resolves the navigation target for a notification. Falls back to deriving
 * a profile link for `user_followed` notifications stored before `actionUrl`
 * was persisted on the notification's `data`.
 */
function resolveActionUrl(type: string, data: Record<string, unknown> | null): string | null {
	if (typeof data?.actionUrl === 'string') return data.actionUrl;

	if (type === 'user_followed' && typeof data?.followerUsername === 'string' && data.followerUsername) {
		return `/client/profile/${data.followerUsername}`;
	}

	return null;
}

function humanise(type: string): string {
	return type
		.split('_')
		.map((s) => (s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s))
		.join(' ');
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
