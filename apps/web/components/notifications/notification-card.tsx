'use client';

import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NotificationListItem } from '@/lib/notifications/types';

import { NotificationIcon, priorityBorderClass } from './icon-map';
import { describeActors } from './group-utils';

interface NotificationCardProps {
	notification: NotificationListItem;
	onMarkRead?: (id: string) => void;
	onMarkUnread?: (id: string) => void;
	onDismiss?: (id: string) => void;
	onSelectChange?: (id: string, selected: boolean) => void;
	selected?: boolean;
	selectable?: boolean;
}

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
	const { id, type, category, priority, title, message, data, isRead, createdAt } = notification;
	const { count, primary } = describeActors(data);
	const actionUrl = typeof data?.actionUrl === 'string' ? (data.actionUrl as string) : null;

	const handleClick = () => {
		if (!isRead) onMarkRead?.(id);
		if (actionUrl) router.push(actionUrl);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	};

	const typeLabel = safeT(t, type, humanise(type));

	return (
		<div
			role="button"
			tabIndex={0}
			aria-label={`${typeLabel}: ${title || message}`}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={cn(
				'relative px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-[3px]',
				isRead ? 'border-transparent hover:bg-muted/40' : `${priorityBorderClass(priority)} bg-primary/4 hover:bg-primary/8`
			)}
		>
			{!isRead && (
				<span className="absolute top-4 left-2 w-2 h-2 bg-primary rounded-full" aria-hidden="true" />
			)}

			<div className="flex items-start gap-3">
				{selectable && (
					<input
						type="checkbox"
						checked={selected ?? false}
						onClick={(e) => e.stopPropagation()}
						onChange={(e) => onSelectChange?.(id, e.target.checked)}
						aria-label={isRead ? 'Select read notification' : 'Select unread notification'}
						className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer accent-neutral-900 dark:accent-white"
					/>
				)}

				<div className="shrink-0 mt-0.5">
					<NotificationIcon type={type} category={category} />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2 mb-1">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<Badge variant="outline" className="text-xs px-2 py-0 h-5 font-normal">
									{typeLabel}
								</Badge>
								{!isRead && (
									<Badge variant="default" className="text-xs px-1.5 py-0 h-4 font-normal">
										{safeT(t, 'newBadge', 'New')}
									</Badge>
								)}
							</div>
							<h4
								className={cn(
									'font-medium text-sm leading-snug',
									!isRead ? 'text-foreground' : 'text-muted-foreground'
								)}
							>
								{title}
							</h4>
						</div>

						<div className="flex items-center gap-1 shrink-0">
							{!isRead ? (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 hover:bg-primary/20"
									onClick={(e) => {
										e.stopPropagation();
										onMarkRead?.(id);
									}}
									aria-label="Mark as read"
								>
									<Check className="h-3 w-3" />
								</Button>
							) : (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 hover:bg-muted"
									onClick={(e) => {
										e.stopPropagation();
										onMarkUnread?.(id);
									}}
									aria-label="Mark as unread"
								>
									<Check className="h-3 w-3 opacity-40" />
								</Button>
							)}
							{onDismiss && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 hover:bg-muted"
									onClick={(e) => {
										e.stopPropagation();
										onDismiss(id);
									}}
									aria-label="Dismiss notification"
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</div>
					</div>

					<p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
						{count > 1 && primary
							? `${primary} and ${count - 1} other${count - 1 === 1 ? '' : 's'} · ${message}`
							: message}
					</p>

					<div className="flex items-center justify-between mt-2">
						<span className="text-xs text-muted-foreground">
							{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
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
