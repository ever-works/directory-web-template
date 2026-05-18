'use client';

import { Archive, CheckCheck, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BulkAction } from '@/lib/notifications/types';

interface NotificationBulkActionsProps {
	selectedCount: number;
	onAction: (action: BulkAction) => void;
	onClear: () => void;
	disabled?: boolean;
	className?: string;
}

export function NotificationBulkActions({
	selectedCount,
	onAction,
	onClear,
	disabled,
	className
}: NotificationBulkActionsProps) {
	const t = useTranslations('client.notifications.bulk');
	if (selectedCount === 0) return null;
	return (
		<div
			className={cn(
				'sticky top-0 z-10 flex items-center justify-between gap-2 rounded-md border border-border bg-popover px-3 py-2 shadow-sm',
				className
			)}
		>
			<span className="text-xs font-medium">
				{safeT(t, 'selected', `${selectedCount} selected`).replace('{n}', String(selectedCount))}
			</span>
			<div className="flex items-center gap-1">
				<Button
					size="sm"
					variant="ghost"
					className="h-7 gap-1 px-2 text-xs"
					onClick={() => onAction('read')}
					disabled={disabled}
				>
					<CheckCheck className="h-3 w-3" />
					{safeT(t, 'markRead', 'Mark read')}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 gap-1 px-2 text-xs"
					onClick={() => onAction('archive')}
					disabled={disabled}
				>
					<Archive className="h-3 w-3" />
					{safeT(t, 'archive', 'Archive')}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
					onClick={() => onAction('delete')}
					disabled={disabled}
				>
					<Trash2 className="h-3 w-3" />
					{safeT(t, 'delete', 'Delete')}
				</Button>
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7"
					onClick={onClear}
					aria-label={safeT(t, 'aria.clear', 'Clear selection')}
				>
					<X className="h-3.5 w-3.5" />
				</Button>
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
