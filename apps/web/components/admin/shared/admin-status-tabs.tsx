'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StatusTabOption<T extends string = string> {
	value: T | '';
	label: string;
	count?: number;
	icon?: ReactNode;
}

export interface AdminStatusTabsProps<T extends string = string> {
	options: StatusTabOption<T>[];
	value: T | '';
	onChange: (status: T | '') => void;
	className?: string;
	size?: 'sm' | 'md';
	showCounts?: boolean;
}

const SIZE_CLASSES = {
	sm: 'px-2 py-1 text-[11px]',
	md: 'px-2.5 py-1.5 text-xs',
} as const;

export function AdminStatusTabs<T extends string = string>({
	options,
	value,
	onChange,
	className,
	size = 'md',
	showCounts = true,
}: AdminStatusTabsProps<T>) {
	const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
		if (e.key === 'ArrowLeft' && index > 0) {
			e.preventDefault();
			onChange(options[index - 1].value);
		} else if (e.key === 'ArrowRight' && index < options.length - 1) {
			e.preventDefault();
			onChange(options[index + 1].value);
		}
	};

	return (
		<div
			role="tablist"
			className={cn(
				'flex items-center gap-0.5 rounded-lg p-0.5',
				'bg-gray-100 dark:bg-white/3',
				'border border-gray-200/60 dark:border-white/6',
				className
			)}
		>
			{options.map((option, index) => {
				const isActive = value === option.value;
				return (
					<button
						key={option.value || 'all'}
						type="button"
						role="tab"
						aria-selected={isActive}
						tabIndex={isActive ? 0 : -1}
						onClick={() => onChange(option.value)}
						onKeyDown={(e) => handleKeyDown(e, index)}
						className={cn(
							'inline-flex items-center gap-1 rounded-md font-medium transition-all duration-150',
							'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary/40',
							SIZE_CLASSES[size],
							isActive
								? [
										'bg-white dark:bg-white/5 text-gray-900 dark:text-white',
										'shadow-sm border border-gray-200/80 dark:border-white/10',
									]
								: [
										'text-gray-500 dark:text-gray-400',
										'hover:text-gray-700 dark:hover:text-gray-200',
										'hover:bg-white/60 dark:hover:bg-white/6',
									]
						)}
					>
						{option.icon && <span className="shrink-0">{option.icon}</span>}
						<span>{option.label}</span>
						{showCounts && option.count !== undefined && (
							<span
								className={cn(
									'tabular-nums text-[10px] font-medium leading-none rounded-full px-1.5 py-0.5',
									isActive
										? 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400'
										: 'text-gray-400 dark:text-gray-500'
								)}
							>
								{option.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
