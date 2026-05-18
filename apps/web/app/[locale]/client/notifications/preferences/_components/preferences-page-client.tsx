'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationPreferencesForm, NotificationListSkeleton } from '@/components/notifications';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

export function PreferencesPageClient() {
	const t = useTranslations('client.notifications.preferences');
	const { preferences, isLoading, save, isSaving } = useNotificationPreferences();

	return (
		<div className="flex flex-col gap-4">
			<header className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Link
						href="/client/notifications"
						aria-label="Back to notifications"
						className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
					>
						<ChevronLeft className="h-4 w-4" />
					</Link>
					<h1 className="text-xl font-semibold">{safeT(t, 'pageTitle', 'Notification preferences')}</h1>
				</div>
			</header>

			{isLoading || !preferences ? (
				<NotificationListSkeleton rows={3} />
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
