'use client';

import { Archive, CheckCheck, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { BulkAction } from '@/lib/notifications/types';

interface NotificationBulkActionsProps {
	selectedCount: number;
	onAction: (action: BulkAction) => void;
	onClear: () => void;
	disabled?: boolean;
	className?: string;
}

const TRIGGER_BASE =
	'inline-flex items-center gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-xs font-medium rounded-lg border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

const TRIGGER_NEUTRAL = cn(
	TRIGGER_BASE,
	'border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/6'
);

const TRIGGER_DESTRUCTIVE = cn(
	TRIGGER_BASE,
	'border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50'
);

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
			role="region"
			aria-label="Bulk actions"
			className={cn(
				'flex items-center justify-between gap-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3 px-4 py-2.5',
				className
			)}
		>
			<span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
				{safeT(t, 'selected', `${selectedCount} selected`).replace('{n}', String(selectedCount))}
			</span>
			<div className="flex items-center gap-1.5">
				<button type="button" onClick={() => onAction('read')} disabled={disabled} className={TRIGGER_NEUTRAL}>
					<CheckCheck className="h-3 w-3" aria-hidden="true" />
					{safeT(t, 'markRead', 'Mark read')}
				</button>
				<button type="button" onClick={() => onAction('archive')} disabled={disabled} className={TRIGGER_NEUTRAL}>
					<Archive className="h-3 w-3" aria-hidden="true" />
					{safeT(t, 'archive', 'Archive')}
				</button>
				<button
					type="button"
					onClick={() => onAction('delete')}
					disabled={disabled}
					className={TRIGGER_DESTRUCTIVE}
				>
					<Trash2 className="h-3 w-3" aria-hidden="true" />
					{safeT(t, 'delete', 'Delete')}
				</button>
				<button
					type="button"
					onClick={onClear}
					aria-label={safeT(t, 'aria.clear', 'Clear selection')}
					className="inline-flex items-center justify-center h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
				>
					<X className="h-3.5 w-3.5" aria-hidden="true" />
				</button>
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
