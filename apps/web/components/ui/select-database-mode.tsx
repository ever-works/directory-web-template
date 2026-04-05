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
				'group p-5 rounded-xl',
				'bg-white/80 dark:bg-white/[0.04]',
				'border border-gray-200/50 dark:border-white/[0.07]',
				'shadow-sm',
				'transition-all duration-200',
				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					{/* Icon container with emerald gradient and glassmorphism */}
					<div
						className={cn(
							'bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex-shrink-0',
						)}
					>
						<Database className="h-5 w-5 text-gray-400 dark:text-gray-500" />
					</div>

					{/* Text content with improved typography */}
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100">
							{t('DATABASE_MODE')}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
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
