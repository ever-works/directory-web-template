import { Plus, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PageHeaderProps {
	onAddClient: () => void;
}

export function PageHeader({ onAddClient }: PageHeaderProps) {
	const t = useTranslations('admin.ADMIN_CLIENTS_PAGE');

	return (
		<div className="mb-8">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				{/* Left: icon + title + subtitle */}
				<div className="flex items-center gap-4">
					<div className="w-11 h-11 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25 dark:shadow-blue-500/15">
						<Users className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight tracking-tight">
							{t('TITLE')}
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('SUBTITLE')}</p>
					</div>
				</div>

				{/* Right: Add button */}
				<button
					type="button"
					onClick={onAddClient}
					className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:focus:ring-white dark:focus:ring-offset-gray-950 shrink-0"
				>
					<Plus className="w-4 h-4" />
					{t('ADD_CLIENT')}
				</button>
			</div>

			{/* Gradient divider */}
			<div className="mt-5 h-px bg-linear-to-r from-gray-200 via-gray-100 to-transparent dark:from-white/10 dark:via-white/5 dark:to-transparent" />
		</div>
	);
}
