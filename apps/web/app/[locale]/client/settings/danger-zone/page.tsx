import { Container } from '@/components/ui/container';
import { FiArrowLeft } from 'react-icons/fi';
import { ShieldAlert, Info } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { DeleteAccountCard } from '@/components/settings/danger-zone/delete-account-card';

export default async function DangerZoneSettingsPage() {
	const t = await getTranslations('settings.DANGER_ZONE_PAGE');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-10 max-w-3xl space-y-8">
					{/* Back link */}
					<Link
						href="/client/settings"
						className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-150"
					>
						<FiArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
						{t('BACK_TO_SETTINGS')}
					</Link>

					{/* Page header */}
					<header className="space-y-3">
						<div className="flex items-center gap-2.5">
							<div
								className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center ring-1 ring-inset ring-gray-200/60 dark:ring-white/[0.06]"
								aria-hidden="true"
							>
								<ShieldAlert className="w-4 h-4 text-gray-500 dark:text-gray-400" />
							</div>
							<h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('TITLE')}
							</h1>
						</div>
						<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-prose">
							{t('SUBTITLE')}
						</p>
					</header>

					{/* Calm intro banner — neutral surface, just sets expectations */}
					<aside
						role="note"
						className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-[#111111] px-4 py-3 shadow-sm"
					>
						<Info className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden="true" />
						<div className="min-w-0">
							<p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{t('INTRO_LABEL')}</p>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
								{t('INTRO_BODY')}
							</p>
						</div>
					</aside>

					{/* Destructive actions */}
					<DeleteAccountCard />
				</div>
			</Container>
		</div>
	);
}
