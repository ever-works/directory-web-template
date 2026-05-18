'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface NotificationSelectOption {
	value: string;
	label: string;
}

interface NotificationSelectProps {
	value: string;
	onChange: (next: string) => void;
	options: NotificationSelectOption[];
	/** Shown when no value matches an option. */
	placeholder: string;
	/** Optional leading icon (e.g. Tag, Flag). */
	icon?: LucideIcon;
	/** Accessible label for the trigger button. */
	ariaLabel: string;
	/** Tailwind width class for the trigger + panel. Defaults to w-32/w-36. */
	widthClass?: string;
	className?: string;
}

/**
 * Drop-in single-select dropdown styled to match
 * `HomeTwoSortSelector` (subtle bg-gray-50 trigger, rounded-lg panel
 * with zoom-in-95 animation, theme-primary check icon).
 */
export function NotificationSelect({
	value,
	onChange,
	options,
	placeholder,
	icon: Icon,
	ariaLabel,
	widthClass = 'w-32 sm:w-36',
	className
}: NotificationSelectProps) {
	const dropdownId = React.useId().replace(/:/g, '');
	const current = options.find((o) => o.value === value);

	return (
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					aria-haspopup="menu"
					aria-controls={dropdownId}
					className={cn(
						'group inline-flex items-center justify-between gap-1.5 text-[10px] sm:text-xs',
						widthClass,
						'rounded-lg border border-gray-300 dark:border-white/6',
						'bg-gray-50 dark:bg-white/4',
						'px-2.5 sm:px-3 h-7 sm:h-8',
						'font-medium',
						'text-gray-900 dark:text-white',
						'transition-all duration-200',
						'hover:bg-gray-100 dark:hover:bg-white/6',
						'focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500',
						className
					)}
				>
					<span className="flex items-center gap-1.5 min-w-0">
						{Icon && <Icon className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />}
						<span className="truncate">{current?.label ?? placeholder}</span>
					</span>
					<ChevronDown
						className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400 transition-transform group-data-[state=open]:rotate-180"
						aria-hidden="true"
					/>
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					id={dropdownId}
					align="start"
					sideOffset={6}
					className={cn(
						'z-50 min-w-[10rem] max-h-[280px] overflow-y-auto',
						widthClass,
						'rounded-lg border border-gray-200 dark:border-white/8',
						'bg-white dark:bg-[#141414]',
						'shadow-lg shadow-black/10 dark:shadow-black/30',
						'animate-in fade-in zoom-in-95'
					)}
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					<DropdownMenu.RadioGroup
						value={value}
						onValueChange={(next) => onChange(next)}
						className="p-1"
					>
						{options.map((option) => (
							<DropdownMenu.RadioItem
								key={option.value || '__empty__'}
								value={option.value}
								className={cn(
									'relative flex items-center justify-between gap-2 text-[10px] sm:text-xs',
									'px-2 py-1 rounded-md',
									'font-medium',
									'cursor-pointer outline-hidden',
									'text-gray-900 dark:text-gray-100',
									'transition-colors',
									'hover:bg-gray-100 dark:hover:bg-white/6',
									'focus:bg-gray-100 dark:focus:bg-white/6',
									'data-[state=checked]:text-theme-primary-500 dark:data-[state=checked]:text-theme-primary-400'
								)}
							>
								<span className="truncate">{option.label}</span>
								<DropdownMenu.ItemIndicator>
									<Check className="h-3 w-3 text-theme-primary-500 dark:text-theme-primary-400" aria-hidden="true" />
								</DropdownMenu.ItemIndicator>
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>

					<DropdownMenu.Arrow className="fill-white dark:fill-[#141414]" />
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
