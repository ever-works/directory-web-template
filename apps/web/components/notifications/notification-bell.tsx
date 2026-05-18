'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import { cn } from '@/lib/utils';

import { NotificationDropdown } from './notification-dropdown';

interface NotificationBellProps {
	className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
	const t = useTranslations('client.notifications');
	const { user } = useCurrentUser();
	const stats = useNotificationStats(Boolean(user?.id));
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (!wrapperRef.current) return;
			if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	if (!user?.id) return null;

	const unread = stats.data?.unread ?? 0;
	const display = unread > 99 ? '99+' : unread > 0 ? String(unread) : null;
	const ariaLabel = safeT(t, 'aria.bellWithCount', `Notifications, ${unread} unread`).replace('{n}', String(unread));

	return (
		<div ref={wrapperRef} className={cn('relative inline-flex', className)}>
			<button
				type="button"
				aria-label={ariaLabel}
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className={cn(
					'relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors',
					'hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
				)}
			>
				<Bell className="h-4 w-4" aria-hidden="true" />
				{display !== null && (
					<span
						aria-hidden="true"
						className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
					>
						{display}
					</span>
				)}
			</button>
			{open && <NotificationDropdown onClose={() => setOpen(false)} />}
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
