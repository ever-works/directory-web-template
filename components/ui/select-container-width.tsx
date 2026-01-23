'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { useLayoutTheme } from '@/components/context/LayoutThemeContext';

interface SelectContainerWidthProps {
	className?: string;
	disabled?: boolean;
}

const SelectContainerWidth: React.FC<SelectContainerWidthProps> = ({ className, disabled = false }) => {
	const { containerWidth, setContainerWidth } = useLayoutTheme();
	const t = useTranslations('common');

	const handleToggle = (isFluid: boolean) => {
		if (disabled) return;
		const newWidth = isFluid ? 'fluid' : 'fixed';
		setContainerWidth(newWidth);

		// Toast notification
		toast.success(t(isFluid ? 'FULL_WIDTH' : 'FIXED_WIDTH'), {
			duration: 2000,
			description: t(isFluid ? 'FULL_WIDTH_DESC' : 'FIXED_WIDTH_DESC')
		});
	};

	return (
		<div
			className={cn(
				// Structure
				'group p-5 rounded-xl',

				// Teal/Cyan gradient - width/expansion feel
				'bg-gradient-to-br from-teal-50/80 via-cyan-50/60 to-emerald-50/40',
				'dark:from-teal-950/40 dark:via-cyan-950/30 dark:to-emerald-950/20',

				// Glassmorphism
				'backdrop-blur-xl backdrop-saturate-150',

				// Border with teal tones
				'border border-teal-200/40 dark:border-teal-800/30',

				// Enhanced shadow
				'shadow-lg shadow-black/5 dark:shadow-black/20',

				// Spring animation on hover
				'transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',

				// Hover effects - lift and enhanced border
				'hover:shadow-2xl hover:shadow-teal-500/10',
				'hover:border-teal-300/60 dark:hover:border-teal-700/50',

				// Animation entrance
				'animate-fade-in-up',

				className
			)}
		>
			<div className="flex flex-col md:flex-row items-start justify-between gap-4">
				{/* Icon + Title/Description */}
				<div className="flex items-start gap-3 flex-1 min-w-0 w-full">
					{/* Icon container with teal gradient and glassmorphism */}
					<div
						className={cn(
							'p-2 rounded-lg flex-shrink-0',
							'bg-gradient-to-br from-teal-100 to-cyan-200',
							'dark:from-teal-900/40 dark:to-cyan-900/40',
							'backdrop-blur-md',
							'border border-teal-300/50 dark:border-teal-700/50',
							'shadow-inner',
							// Icon animation
							'transition-transform duration-700 ease-in-out',
							'group-hover:scale-110 group-hover:rotate-3'
						)}
					>
						<Maximize2 className="h-5 w-5 text-teal-700 dark:text-teal-300" />
					</div>

					{/* Text content with improved typography */}
					<div className="flex-1 min-w-0">
						<h3 className="text-base font-semibold tracking-tight leading-tight text-gray-900 dark:text-gray-100">
							{t('CONTAINER_WIDTH')}
						</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mt-1">
							{t('CONTAINER_WIDTH_DESC')}
						</p>
					</div>
				</div>

				{/* Toggle with icons */}
				<div className="flex-shrink-0 w-full md:w-auto">
					<SegmentedToggle
						value={containerWidth === 'fluid'}
						onChange={handleToggle}
						disabled={disabled}
						leftLabel={
							<span className="flex items-center gap-1.5">
								<Minimize2 className="h-3.5 w-3.5" />
								<span>{t('FIXED_WIDTH')}</span>
							</span>
						}
						rightLabel={
							<span className="flex items-center gap-1.5">
								<Maximize2 className="h-3.5 w-3.5" />
								<span>{t('FULL_WIDTH')}</span>
							</span>
						}
					/>
				</div>
			</div>
		</div>
	);
};

export default SelectContainerWidth;
