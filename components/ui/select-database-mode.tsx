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
				// Structure
				'group p-5 rounded-xl',

				// Emerald/Teal/Cyan gradient - data/storage feel
				'bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/40',
				'dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-cyan-950/20',

				// Glassmorphism
				'backdrop-blur-xl backdrop-saturate-150',

				// Border with green tones
				'border border-emerald-200/40 dark:border-emerald-800/30',

				// Enhanced shadow
				'shadow-lg shadow-black/5 dark:shadow-black/20',

				// Spring animation on hover
				'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',

				// Hover effects - lift and enhanced border
				'hover:shadow-2xl hover:shadow-emerald-500/10',
				'hover:border-emerald-300/60 dark:hover:border-emerald-700/50',

				// Animation entrance
				'animate-fade-in-up',

				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					{/* Icon container with emerald gradient and glassmorphism */}
					<div
						className={cn(
							'p-2 rounded-lg flex-shrink-0',
							'bg-gradient-to-br from-emerald-100 to-teal-200',
							'dark:from-emerald-900/40 dark:to-teal-900/40',
							'backdrop-blur-md',
							'border border-emerald-300/50 dark:border-emerald-700/50',
							'shadow-inner',
							// Icon animation
							'transition-transform duration-700 ease-in-out',
							'group-hover:scale-110 group-hover:rotate-3'
						)}
					>
						<Database className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
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
