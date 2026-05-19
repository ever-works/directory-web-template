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
						<Layers className="w-4 h-4 text-theme-primary-600 dark:text-theme-primary-400" />
					</div>

					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">
							{t('PAGINATION_STYLE')}
						</h3>
						<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
