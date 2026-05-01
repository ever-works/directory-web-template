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
		<div className="mb-8">
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
				{/* Left: Title + subtitle */}
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">{t('TITLE')}</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{t('SUBTITLE')}</p>
				</div>

				{/* Right: Add button */}
				<Button
					color="primary"
					size="md"
					onPress={onAddClient}
					startContent={<Plus size={16} />}
					className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 text-white font-medium rounded-xl shrink-0"
				>
					{t('ADD_CLIENT')}
				</Button>
			</div>
		</div>
	);
}
