import { Button } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PageHeaderProps {
	onAddCompany: () => void;
}

const HEADER_WRAPPER =
	'bg-linear-to-r from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg p-6';
const ICON_WRAPPER =
	'w-12 h-12 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg';
const ADD_BUTTON_CLASSES =
	'bg-linear-to-r from-theme-primary to-theme-accent hover:from-theme-primary/90 hover:to-theme-accent/90 shadow-lg shadow-theme-primary/25 hover:shadow-xl hover:shadow-theme-primary/40 transition-all duration-300 text-white font-medium';

/**
 * Page Header Component
 * Displays page title and add company button
 */
export function PageHeader({ onAddCompany }: PageHeaderProps) {
	const t = useTranslations('admin.ADMIN_COMPANIES_PAGE');

	return (
		<div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div>
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('TITLE')}</h1>
				<div className="flex items-center gap-2 mt-1">
					<span className="w-8 h-1 bg-blue-600 rounded-full inline-block" />
					<p className="text-gray-500 dark:text-gray-400 font-medium">{t('SUBTITLE')}</p>
				</div>
			</div>

			<Button
				color="primary"
				size="lg"
				onPress={onAddCompany}
				startContent={<Plus size={20} />}
				className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/30 transition-all rounded-xl px-6"
			>
				{t('ADD_COMPANY')}
			</Button>
		</div>
	);
}
