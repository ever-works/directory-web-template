import { Container } from '@/components/ui/container';
import { Card, CardContent } from '@/components/ui/card';
import { FiArrowLeft } from 'react-icons/fi';
import { AlertTriangle } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { DeleteAccountCard } from '@/components/settings/danger-zone/delete-account-card';

export default async function DangerZoneSettingsPage() {
	const t = await getTranslations('settings.DANGER_ZONE_PAGE');

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<Container maxWidth="7xl" padding="default" useGlobalWidth>
				<div className="py-8 space-y-6">
					{/* Back link */}
					<div>
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-3.5 h-3.5" />
							{t('BACK_TO_SETTINGS')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center">
							<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
						</div>
						<div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
						</div>
					</div>

					{/* Warning callout */}
					<Card className="border border-red-200/60 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 max-w-3xl">
						<CardContent className="p-5">
							<div className="flex items-start gap-3">
								<AlertTriangle
									className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
									aria-hidden="true"
								/>
								<div>
									<h2 className="text-sm font-semibold text-red-900 dark:text-red-100">
										{t('WARNING_TITLE')}
									</h2>
									<p className="text-xs text-red-800/90 dark:text-red-200/90 mt-1 leading-relaxed">
										{t('WARNING_BODY')}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Destructive actions */}
					<div className="max-w-3xl">
						<DeleteAccountCard />
					</div>
				</div>
			</Container>
		</div>
	);
}
