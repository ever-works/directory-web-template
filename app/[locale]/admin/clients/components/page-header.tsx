import { Button } from '@heroui/react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
					{/* Optional: Period navigation like in reference */}
					<div className="hidden sm:flex items-center gap-1 ml-2">
						<button
							type="button"
							className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-label="Previous"
						>
							<ChevronLeft className="w-4 h-4 text-gray-400" />
						</button>
						<span className="text-sm font-medium text-gray-600 dark:text-gray-400 px-2">FY 2026</span>
						<button
							type="button"
							className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
							aria-label="Next"
						>
							<ChevronRight className="w-4 h-4 text-gray-400" />
						</button>
					</div>
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
