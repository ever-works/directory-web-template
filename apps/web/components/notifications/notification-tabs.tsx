'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { NotificationTab } from '@/lib/notifications/registry';

interface NotificationTabsProps {
	value: NotificationTab;
	onChange: (next: NotificationTab) => void;
	counts?: Partial<Record<NotificationTab, number>>;
	className?: string;
}

const TABS: NotificationTab[] = ['all', 'unread', 'mentions', 'system'];

export function NotificationTabs({ value, onChange, counts, className }: NotificationTabsProps) {
	const t = useTranslations('client.notifications.tabs');

	return (
		<div role="tablist" className={cn('flex items-center gap-1 border-b border-border px-2', className)}>
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
							'relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
							active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
						)}
					>
						<span>{safeT(t, tab, fallbackLabel(tab))}</span>
						{typeof count === 'number' && count > 0 && (
							<span
								className={cn(
									'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
									active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
								)}
							>
								{count > 99 ? '99+' : count}
							</span>
						)}
						{active && (
							<span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
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
