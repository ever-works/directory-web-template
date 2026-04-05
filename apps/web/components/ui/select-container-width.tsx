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
					{/* Icon container with teal gradient and glassmorphism */}
					<div
						className={cn(
							'bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex-shrink-0',
						)}
					>
						<Maximize2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
