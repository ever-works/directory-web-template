'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (!wrapperRef.current) return;
			if (!wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
		};
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsOpen(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKey);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKey);
		};
	}, [isOpen]);

	if (!user?.id) return null;

	const unreadCount = stats.data?.unread ?? 0;
	const ariaLabel = safeT(t, 'aria.bellWithCount', `Notifications, ${unreadCount} unread`).replace(
		'{n}',
		String(unreadCount)
	);

	return (
		<div ref={wrapperRef} className={cn('relative', className)}>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setIsOpen((v) => !v)}
				className={cn(
					'relative transition-all duration-200 border-none',
					isOpen ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted/40'
				)}
				aria-label={ariaLabel}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				aria-controls="client-notifications-dropdown"
			>
				<Bell
					className={cn('h-5 w-5 transition-transform duration-200', isOpen && 'scale-110')}
					aria-hidden="true"
				/>
				{unreadCount > 0 && (
					<Badge
						variant="destructive"
						className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium animate-pulse"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</Badge>
				)}
			</Button>

			{isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
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
