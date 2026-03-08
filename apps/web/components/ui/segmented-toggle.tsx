'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SegmentedToggleProps {
	value: boolean;
	onChange: (value: boolean) => void;
	disabled?: boolean;
	leftLabel?: React.ReactNode;
	rightLabel?: React.ReactNode;
	className?: string;
}

export function SegmentedToggle({
	value,
	onChange,
	disabled = false,
	leftLabel,
	rightLabel,
	className,
}: SegmentedToggleProps) {
	return (
		<div
			className={cn(
				'relative inline-flex items-center',
				'rounded-lg',
				'bg-gradient-to-r from-gray-100 to-gray-50',
				'dark:from-gray-800 dark:to-gray-800/90',
				'border border-gray-200/80 dark:border-gray-700/80',
				'backdrop-blur-sm',
				'p-1',
				'overflow-hidden',
				disabled && 'opacity-50 cursor-not-allowed',
				'select-none', // Prevent text selection during animation
				className
			)}
			role="group"
		>
			{/* Sliding indicator with enhanced animation */}
			<div
				className={cn(
					'absolute inset-y-1 rounded-md',
					'bg-gradient-to-r from-theme-primary-500 to-theme-primary-600',
					'dark:from-theme-primary-600 dark:to-theme-primary-700',
					'shadow-lg shadow-theme-primary-500/30',
					// Spring animation with bounce effect
					'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
					value ? 'left-[calc(50%+0.125rem)]' : 'left-[0.125rem]'
				)}
				style={{
					width: 'calc(50% - 0.25rem)', // Fixed width calculation
				}}
				aria-hidden="true"
			/>

			{/* Left Option Button */}
			<button
				type="button"
				onClick={() => !disabled && onChange(false)}
				disabled={disabled}
				className={cn(
					'relative z-10',
					'px-4 py-2',
					'min-w-[90px]',
					'text-xs font-medium tracking-wide',
					'rounded-md',
					'transition-all duration-300 ease-out',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-1',
					'flex items-center justify-center', // Ensure centering
					'cursor-pointer', // Added cursor pointer
					// Text colors
					!value
						? 'text-white dark:text-white'
						: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
					disabled && 'cursor-not-allowed'
				)}
			>
				<span className="relative z-20">
					{leftLabel}
				</span>
			</button>

			{/* Right Option Button */}
			<button
				type="button"
				onClick={() => !disabled && onChange(true)}
				disabled={disabled}
				className={cn(
					'relative z-10',
					'px-4 py-2',
					'min-w-[90px]',
					'text-xs font-medium tracking-wide',
					'rounded-md',
					'transition-all duration-300 ease-out',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-1',
					'flex items-center justify-center', // Ensure centering
					'cursor-pointer', // Added cursor pointer
					// Text colors
					value
						? 'text-white dark:text-white'
						: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
					disabled && 'cursor-not-allowed'
				)}
			>
				<span className="relative z-20 -mr-2">
					{rightLabel}
				</span>
			</button>
		</div>
	);
}