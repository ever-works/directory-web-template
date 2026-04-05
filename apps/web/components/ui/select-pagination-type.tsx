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
					{/* Icon container with blue gradient and glassmorphism */}
					<div
						className={cn(
							'bg-gray-100 dark:bg-white/5 p-2 rounded-lg flex-shrink-0',
						)}
					>
						<Layers className="h-5 w-5 text-gray-400 dark:text-gray-500" />
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
