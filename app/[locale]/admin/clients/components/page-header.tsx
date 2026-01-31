import { Button } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PageHeaderProps {
	onAddClient: () => void;
}

/**
 * Page Header Component
 * Clean, minimal header design inspired by modern dashboards
 */
export function PageHeader({ onAddClient }: PageHeaderProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<div className="mb-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				{/* Left: Title with navigation */}
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('TITLE')}</h1>
				</div>

				{/* Right: Add button */}
				<Button
					color="primary"
					size="md"
					onPress={onAddClient}
					startContent={<Plus size={16} />}
					className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 text-white font-medium"
				>
					{t('ADD_CLIENT')}
				</Button>
			</div>
			<p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('SUBTITLE')}</p>
		</div>
	);
}
