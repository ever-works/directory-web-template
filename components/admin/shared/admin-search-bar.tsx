'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useTranslations } from 'next-intl';

export interface AdminSearchBarProps {
	/** Current search value */
	value: string;
	/** Callback when search value changes */
	onChange: (value: string) => void;
	/** Whether search is in progress (shows loading spinner) */
	isSearching?: boolean;
	/** Placeholder text */
	placeholder?: string;
	/** Aria label for accessibility */
	ariaLabel?: string;
	/** Additional CSS classes */
	className?: string;
	/** Whether to show clear button when text is present (default: true) */
	showClearButton?: boolean;
	/** Size variant */
	size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
	sm: 'pl-9 pr-8 py-2 text-sm',
	md: 'pl-12 pr-10 py-3',
	lg: 'pl-14 pr-12 py-4 text-lg',
} as const;

const ICON_POSITIONS = {
	sm: { left: 'left-3', right: 'right-3' },
	md: { left: 'left-4', right: 'right-4' },
	lg: { left: 'left-5', right: 'right-5' },
} as const;

const ICON_SIZES = {
	sm: 'h-3.5 w-3.5',
	md: 'h-4 w-4',
	lg: 'h-5 w-5',
} as const;

const INPUT_BASE_CLASSES = cn(
	'w-full bg-white dark:bg-gray-800',
	'border border-gray-200 dark:border-gray-700 rounded-xl',
	'focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary',
	'transition-all duration-200',
	'text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400'
);

const CLEAR_BUTTON_CLASSES = cn(
	'absolute top-1/2 -translate-y-1/2 p-1 rounded-full',
	'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/50'
);

/**
 * Search input component for admin pages.
 * Shows loading spinner while searching, clear button when text is present.
 *
 * Note: This is a presentational component. It does NOT implement debouncing.
 * Use with `useAdminFilters` hook to get debounced search (300ms, 2 char min).
 *
 * @example
 * ```tsx
 * // Recommended: Use with useAdminFilters for debouncing
 * const { searchTerm, setSearchTerm, isSearching } = useAdminFilters();
 *
 * <AdminSearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   isSearching={isSearching}
 *   placeholder="Search items..."
 * />
 * ```
 */
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
	const handleClear = () => onChange('');

	const sizeClasses = SIZE_CLASSES[size];
	const iconPosition = ICON_POSITIONS[size];
	const iconSize = ICON_SIZES[size];

	return (
		<div className={cn('relative', className)}>
			{/* Search Icon */}
			<Search
				className={cn(
					'absolute top-1/2 -translate-y-1/2 text-gray-400',
					iconPosition.left,
					iconSize
				)}
				aria-hidden="true"
			/>

			{/* Input */}
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				aria-label={ariaLabel || placeholder}
				className={cn(INPUT_BASE_CLASSES, sizeClasses)}
			/>

			{/* Right Side: Loading Spinner or Clear Button */}
			{isSearching ? (
				<div className={cn('absolute top-1/2 -translate-y-1/2', iconPosition.right)}>
					<LoadingSpinner size="sm" color="gray" />
				</div>
			) : (
				showClearButton &&
				value && (
					<button
						type="button"
						onClick={handleClear}
						className={cn(CLEAR_BUTTON_CLASSES, iconPosition.right)}
						aria-label={t('CLEAR_SEARCH')}
					>
						<X
							className={cn(
								'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
								iconSize
							)}
						/>
					</button>
				)
			)}
		</div>
	);
}
