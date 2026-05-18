'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { NotificationListItem } from '@/lib/notifications/types';

import { NotificationIcon, priorityBorderClass } from './icon-map';

interface NotificationCardProps {
	notification: NotificationListItem;
	onMarkRead?: (id: string) => void;
	onMarkUnread?: (id: string) => void;
	onDismiss?: (id: string) => void;
	onSelectChange?: (id: string, selected: boolean) => void;
	selected?: boolean;
	selectable?: boolean;
}

/**
 * Spec 027 v2 — Notification row.
 *
 * Modern SaaS row: icon chip + title/message stack + right rail with
 * a small relative time chip and hover-revealed actions (mark read,
 * archive, open).  Unread state combines:
 *   - 3px left border in the priority color
 *   - subtle bg-primary tint
 *   - bold title
 *   - small primary dot in the left rail
 *
 * Whole row is keyboard-activatable (Enter/Space). Action buttons are
 * separate focusable elements with their own aria-labels.
 */
export function NotificationCard({
	notification,
	onMarkRead,
	onMarkUnread,
	onDismiss,
	onSelectChange,
	selected,
	selectable
}: NotificationCardProps) {
	const router = useRouter();
	const t = useTranslations('client.notifications.types');
	const tActions = useTranslations('client.notifications.actions');
	const { id, type, category, priority, title, message, data, isRead, createdAt } = notification;
	const actionUrl = typeof data?.actionUrl === 'string' ? (data.actionUrl as string) : null;

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
	const absoluteTime = format(createdAtDate, "PPpp");

	return (
		<div
			role="button"
			tabIndex={0}
			aria-label={`${typeLabel}: ${title || message}`}
			data-notification-id={id}
			data-notification-state={isRead ? 'read' : 'unread'}
			onClick={handleNavigate}
			onKeyDown={handleKeyDown}
			className={cn(
				'group/row relative flex gap-3 px-4 py-3 cursor-pointer',
				'transition-colors duration-150',
				'border-l-[3px]',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-inset',
				isRead
					? 'border-transparent hover:bg-gray-50 dark:hover:bg-white/3'
					: cn(priorityBorderClass(priority), 'bg-primary/[0.03] hover:bg-primary/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/4')
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

			<div className="relative shrink-0 pt-0.5">
				{!isRead && (
					<span
						className="absolute -left-1 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-white dark:ring-[#0a0a0a]"
						aria-hidden="true"
					/>
				)}
				<div
					className={cn(
						'flex h-9 w-9 items-center justify-center rounded-full',
						'bg-gray-100 dark:bg-white/6',
						'transition-transform duration-200 group-hover/row:scale-105'
					)}
				>
					<NotificationIcon type={type} category={category} />
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
								isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
							)}
						>
							{message}
						</p>
					</div>

					<time
						dateTime={createdAt}
						title={absoluteTime}
						className="shrink-0 text-[11px] font-medium text-gray-500 dark:text-gray-500 tabular-nums whitespace-nowrap"
					>
						{shortRelative(relativeTime)}
					</time>
				</div>

				<div className="mt-2 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<span className="inline-flex items-center rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/4 px-1.5 py-0 h-5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
							{typeLabel}
						</span>
						{priority === 'critical' && (
							<span className="inline-flex items-center rounded-md bg-red-100 dark:bg-red-500/10 px-1.5 py-0 h-5 text-[10px] font-medium text-red-700 dark:text-red-300">
								{safeT(tActions, 'criticalLabel', 'Critical')}
							</span>
						)}
						{priority === 'high' && !isRead && (
							<span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-500/10 px-1.5 py-0 h-5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
								{safeT(tActions, 'highLabel', 'Important')}
							</span>
						)}
					</div>

					<div
						className={cn(
							'flex items-center gap-0.5 shrink-0',
							'opacity-0 -translate-x-1 transition-all duration-150',
							'group-hover/row:opacity-100 group-hover/row:translate-x-0',
							'group-focus-within/row:opacity-100 group-focus-within/row:translate-x-0',
							'motion-reduce:opacity-100 motion-reduce:translate-x-0'
						)}
					>
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
							label={isRead ? safeT(tActions, 'markUnread', 'Mark as unread') : safeT(tActions, 'markRead', 'Mark as read')}
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

/**
 * Shorten common date-fns outputs to a Twitter-style chip:
 * "about 2 minutes" -> "2m", "1 day" -> "1d", "less than a minute" -> "now".
 */
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
