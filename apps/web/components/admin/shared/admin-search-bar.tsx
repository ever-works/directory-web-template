'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslations } from 'next-intl';

export interface AdminSearchBarProps {
	value: string;
	onChange: (value: string) => void;
	isSearching?: boolean;
	placeholder?: string;
	ariaLabel?: string;
	className?: string;
	showClearButton?: boolean;
	size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
	sm: 'pl-8 pr-7 py-1.5 text-xs',
	md: 'pl-10 pr-9 py-2.5 text-sm',
	lg: 'pl-12 pr-10 py-3 text-base',
} as const;

const ICON_POSITIONS = {
	sm: { left: 'left-2.5', right: 'right-2' },
	md: { left: 'left-3', right: 'right-3' },
	lg: { left: 'left-4', right: 'right-3.5' },
} as const;

const ICON_SIZES = {
	sm: 'h-3.5 w-3.5',
	md: 'h-4 w-4',
	lg: 'h-5 w-5',
} as const;

export function AdminSearchBar({
	value,
	onChange,
	isSearching = false,
	placeholder,
	ariaLabel,
	className,
	showClearButton = true,
	size = 'md',
}: AdminSearchBarProps) {
	const t = useTranslations('admin.SHARED');
	const effectivePlaceholder = placeholder || t('SEARCH_PLACEHOLDER');

	return (
		<div className={cn('relative group', className)}>
			{/* Search icon */}
			<Search
				aria-hidden="true"
				className={cn(
					'absolute top-1/2 -translate-y-1/2 pointer-events-none',
					'text-gray-400 dark:text-gray-500',
					'transition-colors duration-150 group-focus-within:text-theme-primary',
					ICON_POSITIONS[size].left,
					ICON_SIZES[size]
				)}
			/>

			{/* Input */}
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={effectivePlaceholder}
				aria-label={ariaLabel || effectivePlaceholder}
				className={cn(
					'w-full rounded-xl',
					'bg-white dark:bg-white/3',
					'border border-gray-200 dark:border-white/8',
					'text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
					'focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary',
					'hover:border-gray-300 dark:hover:border-white/12',
					'transition-all duration-150',
					SIZE_CLASSES[size]
				)}
			/>

			{/* Right slot: spinner or clear */}
			<div className={cn('absolute top-1/2 -translate-y-1/2', ICON_POSITIONS[size].right)}>
				{isSearching ? (
					<LoadingSpinner size="sm" color="gray" />
				) : (
					showClearButton &&
					value && (
						<button
							type="button"
							onClick={() => onChange('')}
							aria-label={t('CLEAR_SEARCH')}
							className={cn(
								'p-0.5 rounded-full',
								'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
								'hover:bg-gray-100 dark:hover:bg-gray-800',
								'transition-colors duration-100',
								'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40'
							)}
						>
							<X className={ICON_SIZES[size]} />
						</button>
					)
				)}
			</div>
		</div>
	);
}
