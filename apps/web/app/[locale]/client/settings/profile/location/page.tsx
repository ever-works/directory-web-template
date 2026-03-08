'use client';

import { Container } from '@/components/ui/container';
import { FiMapPin, FiArrowLeft } from 'react-icons/fi';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LocationSettingsForm } from '@/components/settings/LocationSettingsForm';

export default function LocationSettingsPage() {
	const t = useTranslations('settings.LOCATION_SETTINGS');

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
			<Container maxWidth="7xl" padding="default">
				<div className="space-y-8 py-8">
					{/* Back link */}
					<div className="flex items-center gap-4">
						<Link
							href="/client/settings"
							className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
						>
							<FiArrowLeft className="w-4 h-4" />
							{t('BACK')}
						</Link>
					</div>

					{/* Header */}
					<div className="text-center space-y-4">
						<div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-theme-primary-100 to-theme-primary-200 dark:from-theme-primary-900/40 dark:to-theme-primary-800/40 rounded-2xl mb-4">
							<FiMapPin className="w-8 h-8 text-theme-primary-600 dark:text-theme-primary-400" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
							{t('TITLE')}
						</h1>
						<p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
							{t('DESCRIPTION')}
						</p>
					</div>

					{/* Form */}
					<LocationSettingsForm />
				</div>
			</Container>
		</div>
	);
}
