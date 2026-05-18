'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NotificationListItem } from '@/lib/notifications/types';

import { NotificationIcon } from './icon-map';
import { describeActors } from './group-utils';

interface NotificationCardProps {
	notification: NotificationListItem;
	onMarkRead?: (id: string) => void;
	onMarkUnread?: (id: string) => void;
	onDismiss?: (id: string) => void;
	onSelectChange?: (id: string, selected: boolean) => void;
	selected?: boolean;
	selectable?: boolean;
	className?: string;
}

export function NotificationCard({
	notification,
	onMarkRead,
	onMarkUnread,
	onDismiss,
	onSelectChange,
	selected,
	selectable,
	className
}: NotificationCardProps) {
	const router = useRouter();
	const { id, type, priority, title, message, data, isRead, createdAt } = notification;
	const { count, primary } = describeActors(data);
	const actionUrl = typeof data?.actionUrl === 'string' ? (data.actionUrl as string) : null;

	const handleClick = () => {
		if (!isRead) onMarkRead?.(id);
		if (actionUrl) router.push(actionUrl);
	};

	return (
		<div
			role="listitem"
			data-state={isRead ? 'read' : 'unread'}
			className={cn(
				'group relative flex gap-3 rounded-md border-l-2 px-3 py-3 transition-colors',
				isRead
					? 'border-transparent hover:bg-muted/60'
					: 'border-primary bg-muted/30 hover:bg-muted/60',
				className
			)}
		>
			{selectable && (
				<input
					type="checkbox"
					checked={selected ?? false}
					onChange={(e) => onSelectChange?.(id, e.target.checked)}
					aria-label={isRead ? 'Select read notification' : 'Select unread notification'}
					className="mt-1 h-4 w-4 shrink-0 cursor-pointer"
					data-notification-type={type}
				/>
			)}

			<NotificationIcon type={type} priority={priority} />

			<button
				type="button"
				onClick={handleClick}
				className="flex min-w-0 flex-1 flex-col text-left"
			>
				<div className="flex items-start gap-2">
					{!isRead && (
						<span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
					)}
					<p className={cn('truncate text-sm', isRead ? 'font-normal text-foreground' : 'font-semibold text-foreground')}>
						{title}
					</p>
				</div>
				<p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
					{count > 1 && primary
						? `${primary} and ${count - 1} other${count - 1 === 1 ? '' : 's'} · ${message}`
						: message}
				</p>
				<span className="mt-1 text-[11px] text-muted-foreground">
					{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
				</span>
			</button>

			<div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100">
				{isRead ? (
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						aria-label="Mark as unread"
						onClick={() => onMarkUnread?.(id)}
					>
						<Check className="h-3.5 w-3.5 opacity-50" />
					</Button>
				) : (
					<Button
						type="button"
						size="icon"
						variant="ghost"
						className="h-7 w-7"
						aria-label="Mark as read"
						onClick={() => onMarkRead?.(id)}
					>
						<Check className="h-3.5 w-3.5" />
					</Button>
				)}
				<Button
					type="button"
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					aria-label="Dismiss notification"
					onClick={() => onDismiss?.(id)}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}
