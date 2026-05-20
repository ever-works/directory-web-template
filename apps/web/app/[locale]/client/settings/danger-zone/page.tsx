import { Container } from '@/components/ui/container';
import { FiArrowLeft } from 'react-icons/fi';
import { ShieldAlert } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { DeleteAccountCard } from '@/components/settings/danger-zone/delete-account-card';

export default async function DangerZoneSettingsPage() {
	const t = await getTranslations('settings.DANGER_ZONE_PAGE');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-8 max-w-3xl">
					{/* Back link */}
					<div>
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page Header */}
					<header className="flex items-start gap-3">
						<div className="w-9 h-9 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center ring-1 ring-inset ring-red-200/70 dark:ring-red-900/50 shrink-0">
							<ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
						</div>
						<div className="min-w-0">
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-prose">
								{t('SUBTITLE')}
							</p>
						</div>
					</header>

					{/* Destructive actions — each owns its own warning + consequence list */}
					<DeleteAccountCard />
				</div>
			</Container>
		</div>
	);
}
