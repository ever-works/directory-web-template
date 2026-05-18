'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NotificationEmptyProps {
	variant?: 'all' | 'unread' | 'mentions' | 'system';
}

export function NotificationEmpty({ variant = 'all' }: NotificationEmptyProps) {
	const t = useTranslations('client.notifications.empty');

	const titleKey =
		variant === 'unread'
			? 'unreadTitle'
			: variant === 'mentions'
				? 'mentionsTitle'
				: variant === 'system'
					? 'systemTitle'
					: 'allTitle';
	const bodyKey =
		variant === 'unread'
			? 'unreadBody'
			: variant === 'mentions'
				? 'mentionsBody'
				: variant === 'system'
					? 'systemBody'
					: 'allBody';

	return (
		<div className="flex flex-col items-center justify-center py-12 px-4">
			<Bell className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
			<h3 className="font-medium text-sm text-foreground mb-1">
				{safeT(t, titleKey, "You're all caught up")}
			</h3>
			<p className="text-xs text-muted-foreground text-center">
				{safeT(t, bodyKey, "We'll let you know when something new happens.")}
			</p>
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
