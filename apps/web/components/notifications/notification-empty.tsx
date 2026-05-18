'use client';

import { BellOff } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationEmptyProps {
	variant?: 'all' | 'unread' | 'mentions' | 'system';
	showPreferencesLink?: boolean;
}

export function NotificationEmpty({ variant = 'all', showPreferencesLink = true }: NotificationEmptyProps) {
	const t = useTranslations('client.notifications.empty');

	const titleKey = variant === 'all' ? 'allTitle' : variant === 'unread' ? 'unreadTitle' : variant === 'mentions' ? 'mentionsTitle' : 'systemTitle';
	const bodyKey = variant === 'all' ? 'allBody' : variant === 'unread' ? 'unreadBody' : variant === 'mentions' ? 'mentionsBody' : 'systemBody';

	return (
		<div className="flex flex-col items-center justify-center px-6 py-10 text-center">
			<BellOff className="mb-3 h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
			<p className="text-sm font-medium text-foreground">{safeT(t, titleKey, 'You are all caught up')}</p>
			<p className="mt-1 max-w-xs text-xs text-muted-foreground">
				{safeT(t, bodyKey, 'We will let you know when something new happens.')}
			</p>
			{showPreferencesLink && (
				<Link
					href="/client/notifications/preferences"
					className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'mt-2 h-auto p-0 text-xs')}
				>
					{safeT(t, 'managePreferences', 'Manage preferences')}
				</Link>
			)}
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
