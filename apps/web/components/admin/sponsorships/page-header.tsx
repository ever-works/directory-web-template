import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

const HEADER_WRAPPER =
	'bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6';
const ICON_WRAPPER =
	'w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg';

/**
 * Page Header Component
 * Displays page title for sponsorships management
 */
export function PageHeader() {
	const t = useTranslations('admin.SPONSORSHIPS');

	return (
		<div className="mb-8">
			<div className={HEADER_WRAPPER}>
				<div className="flex items-center space-x-4">
					<div className={ICON_WRAPPER}>
						<Megaphone aria-hidden="true" className="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('TITLE')}</h1>
						<p className="text-gray-600 dark:text-gray-400 mt-1">{t('SUBTITLE')}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
