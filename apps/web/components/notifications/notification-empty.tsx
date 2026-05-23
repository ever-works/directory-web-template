'use client';

import Link from 'next/link';
import { Bell, CheckCircle2, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface NotificationEmptyProps {
	variant?: 'all' | 'unread' | 'system';
	className?: string;
}

const VARIANTS: Record<
	NonNullable<NotificationEmptyProps['variant']>,
	{ Icon: typeof Bell; titleKey: string; bodyKey: string; titleFallback: string; bodyFallback: string }
> = {
	all: {
		Icon: Inbox,
		titleKey: 'allTitle',
		bodyKey: 'allBody',
		titleFallback: 'You are all caught up',
		bodyFallback: "We will let you know when something new happens."
	},
	unread: {
		Icon: CheckCircle2,
		titleKey: 'unreadTitle',
		bodyKey: 'unreadBody',
		titleFallback: 'Inbox zero',
		bodyFallback: 'Everything has been read.'
	},
	system: {
		Icon: Bell,
		titleKey: 'systemTitle',
		bodyKey: 'systemBody',
		titleFallback: 'No system notifications',
		bodyFallback: 'Account and security alerts will appear here.'
	}
};

export function NotificationEmpty({ variant = 'all', className }: NotificationEmptyProps) {
	const t = useTranslations('client.notifications.empty');
	const meta = VARIANTS[variant];
	const Icon = meta.Icon;

	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center text-center',
				'px-6 py-14 sm:py-16',
				'animate-in fade-in duration-300',
				className
			)}
		>
			<div className="relative mb-4">
				<div
					aria-hidden="true"
					className="absolute inset-0 -m-3 rounded-full bg-gray-100 dark:bg-white/4 blur-md"
				/>
				<div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/6 ring-1 ring-gray-200 dark:ring-white/8">
					<Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
				</div>
			</div>
			<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
				{safeT(t, meta.titleKey, meta.titleFallback)}
			</h3>
			<p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
				{safeT(t, meta.bodyKey, meta.bodyFallback)}
			</p>
			<Link
				href="/client/notifications/preferences"
				className="mt-4 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
			>
				{safeT(t, 'managePreferences', 'Manage preferences')}
			</Link>
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
