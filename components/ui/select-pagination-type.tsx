'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLayoutTheme } from '@/components/context';
import { useTranslations } from 'next-intl';
import { SegmentedToggle } from './segmented-toggle';
import { Layers, Infinity as InfinityIcon } from 'lucide-react';
import { toast } from 'sonner';

interface SelectPaginationTypeProps {
	className?: string;
	disabled?: boolean;
}

const SelectPaginationType: React.FC<SelectPaginationTypeProps> = ({ className, disabled = false }) => {
	const { paginationType, setPaginationType } = useLayoutTheme();
	const t = useTranslations('settings');

	const handleToggle = (isInfinite: boolean) => {
		if (disabled) return;
		const newType = isInfinite ? 'infinite' : 'standard';
		setPaginationType(newType);

		// Toast notification
		toast.success(t(isInfinite ? 'PAGINATION_CHANGED_TO_INFINITE' : 'PAGINATION_CHANGED_TO_STANDARD'), {
			duration: 2000,
			description: t('SETTINGS_SAVED_AUTOMATICALLY')
		});
	};

	return (
		<div
			className={cn(
				// Structure
				'group p-5 rounded-xl',

				// Blue/Indigo/Purple gradient - navigation feel
				'bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/40',
				'dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20',

				// Glassmorphism
				'backdrop-blur-xl backdrop-saturate-150',

				// Border with blue tones
				'border border-blue-200/40 dark:border-blue-800/30',

				// Enhanced shadow
				'shadow-lg shadow-black/5 dark:shadow-black/20',

				// Spring animation on hover
				'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',

				// Hover effects - lift and enhanced border
				'hover:shadow-2xl hover:shadow-blue-500/10',
				'hover:border-blue-300/60 dark:hover:border-blue-700/50',

				// Animation entrance
				'animate-fade-in-up',

				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					{/* Icon container with blue gradient and glassmorphism */}
					<div
						className={cn(
							'p-2 rounded-lg flex-shrink-0',
							'bg-gradient-to-br from-blue-100 to-indigo-200',
							'dark:from-blue-900/40 dark:to-indigo-900/40',
							'backdrop-blur-md',
							'border border-blue-300/50 dark:border-blue-700/50',
							'shadow-inner',
							// Icon animation
							'transition-transform duration-700 ease-in-out',
							'group-hover:scale-110 group-hover:rotate-3'
						)}
					>
						<Layers className="h-5 w-5 text-blue-700 dark:text-blue-300" />
					</div>

					{/* Text content with improved typography */}
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100">
							{t('PAGINATION_STYLE')}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
							{t('PAGINATION_STYLE_DESC')}
						</p>
					</div>
				</div>

				{/* Toggle with icons */}
				<div className="flex-shrink-0 w-full md:w-auto">
					<SegmentedToggle
						value={paginationType === 'infinite'}
						onChange={handleToggle}
						disabled={disabled}
						leftLabel={
							<span className="flex items-center gap-1.5">
								<Layers className="h-3.5 w-3.5" />
								<span>{t('PAGINATION_STANDARD_LABEL')}</span>
							</span>
						}
						rightLabel={
							<span className="flex items-center gap-1.5">
								<InfinityIcon className="h-3.5 w-3.5" />
								<span>{t('PAGINATION_INFINITE_LABEL')}</span>
							</span>
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default SelectPaginationType;
