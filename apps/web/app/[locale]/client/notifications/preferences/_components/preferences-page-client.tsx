'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { NotificationPreferencesForm, NotificationListSkeleton } from '@/components/notifications';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

export function PreferencesPageClient() {
	const t = useTranslations('client.notifications.preferences');
	const { preferences, isLoading, save, isSaving } = useNotificationPreferences();

	return (
		<div>
			<header className="mb-6 flex items-start justify-between gap-4">
				<div className="flex items-center gap-3 min-w-0">
					<Link
						href="/client/notifications"
						aria-label={safeT(t, 'back', 'Back to notifications')}
						className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
					>
						<ChevronLeft className="h-4 w-4" />
					</Link>
					<div className="min-w-0">
						<h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
							{safeT(t, 'pageTitle', 'Notification preferences')}
						</h1>
						<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
							{safeT(t, 'pageSubtitle', 'Pick how and when we notify you.')}
						</p>
					</div>
				</div>
			</header>

			{isLoading || !preferences ? (
				<div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3">
					<NotificationListSkeleton rows={4} />
				</div>
			) : (
				<NotificationPreferencesForm initial={preferences} onSave={save} isSaving={isSaving} />
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
