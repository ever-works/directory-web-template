'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLayoutTheme } from '@/components/context';
import { useTranslations } from 'next-intl';
import { SegmentedToggle } from './segmented-toggle';
import { Database } from 'lucide-react';
import { toast } from 'sonner';

interface SelectDatabaseModeProps {
	className?: string;
	disabled?: boolean;
}

const SelectDatabaseMode: React.FC<SelectDatabaseModeProps> = ({ className, disabled = false }) => {
	const { databaseSimulationMode, setDatabaseSimulationMode } = useLayoutTheme();
	const t = useTranslations('settings');

	const handleToggle = (isDisabled: boolean) => {
		if (disabled) return;
		const newMode = isDisabled ? 'disabled' : 'enabled';
		setDatabaseSimulationMode(newMode);

		// Toast notification
		toast.success(t(isDisabled ? 'DATABASE_MODE_DISABLED' : 'DATABASE_MODE_ENABLED'), {
			duration: 2000,
			description: t('SETTINGS_SAVED_AUTOMATICALLY')
		});
	};

	return (
		<div
			className={cn(
				'p-4 rounded-xl',
				'bg-white dark:bg-[#111111]',
				'border border-gray-200 dark:border-white/6',
				'shadow-sm',
				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					<div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-theme-primary-50 dark:bg-theme-primary-900/30">
						<Database className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
					</div>

					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
							{t('DATABASE_MODE')}
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
							{t('DATABASE_MODE_DESC')}
						</p>
					</div>
				</div>

				{/* Toggle - using text labels (Database doesn't need icons in toggle) */}
				<div className="flex-shrink-0 w-full md:w-auto">
					<SegmentedToggle
						value={databaseSimulationMode === 'disabled'}
						onChange={handleToggle}
						disabled={disabled}
						leftLabel={t('DATABASE_ENABLED_LABEL')}
						rightLabel={t('DATABASE_DISABLED_LABEL')}
					/>
				</div>
			</div>
		</div>
	);
};

export default SelectDatabaseMode;
