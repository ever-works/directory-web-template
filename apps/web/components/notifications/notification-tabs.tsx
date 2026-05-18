'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { NotificationTab } from '@/lib/notifications/registry';

interface NotificationTabsProps {
	value: NotificationTab;
	onChange: (next: NotificationTab) => void;
	counts?: Partial<Record<NotificationTab, number>>;
	/** "page" matches the dashboard tab row (mb-6); "compact" fits inside the dropdown. */
	variant?: 'page' | 'compact';
	className?: string;
}

const TABS: NotificationTab[] = ['all', 'unread', 'mentions', 'system'];

export function NotificationTabs({ value, onChange, counts, variant = 'page', className }: NotificationTabsProps) {
	const t = useTranslations('client.notifications.tabs');

	return (
		<div
			role="tablist"
			aria-label={safeT(t, 'aria', 'Notification filters')}
			className={cn(
				'flex items-center gap-1 border-b border-neutral-200 dark:border-white/8',
				variant === 'page' ? 'mb-6' : 'px-3',
				className
			)}
		>
			{TABS.map((tab) => {
				const active = tab === value;
				const count = counts?.[tab];
				return (
					<button
						key={tab}
						role="tab"
						aria-selected={active}
						type="button"
						onClick={() => onChange(tab)}
						className={cn(
							'relative px-4 py-2.5 text-xs font-medium transition-colors duration-150 inline-flex items-center gap-1.5',
							active
								? 'text-neutral-900 dark:text-white'
								: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
						)}
					>
						<span>{safeT(t, tab, fallbackLabel(tab))}</span>
						{typeof count === 'number' && count > 0 && (
							<span
								className={cn(
									'inline-flex items-center justify-center rounded-full px-1.5 h-4 min-w-[16px] text-[10px] font-semibold tabular-nums',
									active
										? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
										: 'bg-neutral-200 dark:bg-white/10 text-neutral-700 dark:text-neutral-300'
								)}
							>
								{count > 99 ? '99+' : count}
							</span>
						)}
						{active && (
							<span
								aria-hidden="true"
								className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full"
							/>
						)}
					</button>
				);
			})}
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

function fallbackLabel(tab: NotificationTab): string {
	return tab.charAt(0).toUpperCase() + tab.slice(1);
}
