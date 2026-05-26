'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useUserUtils } from '@/hooks/use-user-utils';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import { cn } from '@/lib/utils';

import { NotificationDropdown } from './notification-dropdown';

interface NotificationBellProps {
	className?: string;
}

/**
 * Header notification trigger.
 *
 * Visual contract matches the other header icon buttons (Settings,
 * Theme, Language): h-9 wrapper, h-4 w-4 lg:h-5 lg:w-5 lucide icon,
 * theme-primary hover color + hover:scale-105, and a portal-rendered
 * dark tooltip that mirrors `SettingsButton`.
 */
export function NotificationBell({ className }: NotificationBellProps) {
	const t = useTranslations('client.notifications');
	const { user, isAdmin } = useUserUtils();
	// Admins use the dedicated AdminNotifications bell rendered in the admin layout.
	const isEnabled = Boolean(user?.id) && !isAdmin;
	const stats = useNotificationStats(isEnabled);
	const [isOpen, setIsOpen] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
	const wrapperRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

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

	if (!isEnabled) return null;

	const unreadCount = stats.data?.unread ?? 0;
	const tooltipLabel =
		unreadCount > 0
			? safeT(t, 'aria.bellWithCount', `Notifications (${unreadCount} unread)`).replace(
					'{n}',
					String(unreadCount)
				)
			: safeT(t, 'tooltip', 'Notifications');

	const showTooltip = () => {
		const btn = buttonRef.current;
		if (!btn) return;
		const rect = btn.getBoundingClientRect();
		setTooltipPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
		setHovered(true);
	};
	const hideTooltip = () => setHovered(false);

	const handleClick = () => {
		hideTooltip();
		setIsOpen((v) => !v);
	};

	return (
		<>
			<div ref={wrapperRef} className={cn('relative', className)}>
				<button
					ref={buttonRef}
					type="button"
					onClick={handleClick}
					onMouseEnter={showTooltip}
					onMouseLeave={hideTooltip}
					onFocus={showTooltip}
					onBlur={hideTooltip}
					aria-label={tooltipLabel}
					aria-haspopup="dialog"
					aria-expanded={isOpen}
					aria-controls="client-notifications-dropdown"
					className={cn(
						'relative inline-flex items-center justify-center gap-1.5 h-9 cursor-pointer',
						'font-medium whitespace-nowrap text-sm lg:text-base xl:text-lg',
						'text-gray-700 dark:text-gray-300 transition-all duration-200',
						'hover:text-theme-primary dark:hover:text-theme-primary hover:scale-105'
					)}
				>
					<Bell className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
					{unreadCount > 0 && (
						<span
							aria-hidden="true"
							className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none tabular-nums ring-2 ring-white dark:ring-[#0a0a0a] animate-pulse"
						>
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</button>

				{isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
			</div>

			{hovered &&
				!isOpen &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						className="fixed z-[9999] px-2 py-1 rounded-lg shadow-xl text-xs font-medium border pointer-events-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-800 dark:border-gray-300"
						style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateX(-50%)' }}
					>
						{tooltipLabel}
					</div>,
					document.body
				)}
		</>
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

