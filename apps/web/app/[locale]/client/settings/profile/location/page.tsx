'use client';

import { Container } from '@/components/ui/container';
import { FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LocationSettingsForm } from '@/components/settings/LocationSettingsForm';

export default function LocationSettingsPage() {
	const t = useTranslations('settings.LOCATION_SETTINGS');

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
							{t('BACK')}
						</Link>
					</div>

					{/* Page Header */}
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 bg-theme-primary-100 dark:bg-theme-primary-900/40 rounded-xl flex items-center justify-center">
							<FiMapPin className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<div>
							<h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
								{t('TITLE')}
							</h1>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('DESCRIPTION')}</p>
						</div>
					</div>

					{/* Form */}
					<LocationSettingsForm />
				</div>
			</Container>
		</div>
	);
}
