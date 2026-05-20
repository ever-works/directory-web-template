'use client';

import { useTranslations } from 'next-intl';
import { CalendarDays, Flag, Search, Tag, X } from 'lucide-react';

import {
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
	type NotificationPriority,
	type NotificationType
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

import { NotificationSelect, type NotificationSelectOption } from './notification-select';

export interface NotificationFiltersState {
	q: string;
	types: NotificationType[];
	priorities: NotificationPriority[];
	dateFrom: string | null;
	dateTo: string | null;
}

interface NotificationFiltersProps {
	value: NotificationFiltersState;
	onChange: (next: NotificationFiltersState) => void;
	className?: string;
}

export function NotificationFilters({ value, onChange, className }: NotificationFiltersProps) {
	const t = useTranslations('client.notifications.filters');

	const reset = () => onChange({ q: '', types: [], priorities: [], dateFrom: null, dateTo: null });

	const hasFilters =
		value.q || value.types.length > 0 || value.priorities.length > 0 || value.dateFrom || value.dateTo;

	const typeOptions: NotificationSelectOption[] = [
		{ value: '', label: safeT(t, 'allTypes', 'All types') },
		...NOTIFICATION_TYPES.map((type) => ({ value: type, label: humanise(type) }))
	];

	const priorityOptions: NotificationSelectOption[] = [
		{ value: '', label: safeT(t, 'allPriorities', 'All priorities') },
		...NOTIFICATION_PRIORITIES.map((p) => ({
			value: p,
			label: p.charAt(0).toUpperCase() + p.slice(1)
		}))
	];

	return (
		<div className={cn('flex flex-wrap items-center gap-2', className)}>
			{/* Search input — mirrors HomeTwo tag popover input style */}
			<div className="relative group w-full sm:w-64">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<Search
						className="h-3.5 w-3.5 text-gray-400 group-focus-within:text-theme-primary-500 dark:group-focus-within:text-theme-primary-400 transition-colors"
						aria-hidden="true"
					/>
				</div>
				<input
					type="text"
					value={value.q}
					onChange={(e) => onChange({ ...value, q: e.target.value })}
					placeholder={safeT(t, 'searchPlaceholder', 'Search notifications…')}
					aria-label={safeT(t, 'aria.search', 'Search notifications')}
					className="w-full h-7 sm:h-8 pl-8 pr-7 text-[10px] sm:text-xs bg-gray-50 dark:bg-white/4 border border-gray-300 dark:border-white/6 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 transition-all duration-200"
				/>
				{value.q && (
					<button
						type="button"
						onClick={() => onChange({ ...value, q: '' })}
						className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
						aria-label={safeT(t, 'clearSearch', 'Clear search')}
					>
						<X className="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				)}
			</div>

			{/* Type dropdown */}
			<NotificationSelect
				value={value.types[0] ?? ''}
				onChange={(next) => onChange({ ...value, types: next ? [next as NotificationType] : [] })}
				options={typeOptions}
				placeholder={safeT(t, 'allTypes', 'All types')}
				icon={Tag}
				ariaLabel={safeT(t, 'aria.type', 'Filter by type')}
				widthClass="w-32 sm:w-40"
			/>

			{/* Priority dropdown */}
			<NotificationSelect
				value={value.priorities[0] ?? ''}
				onChange={(next) =>
					onChange({ ...value, priorities: next ? [next as NotificationPriority] : [] })
				}
				options={priorityOptions}
				placeholder={safeT(t, 'allPriorities', 'All priorities')}
				icon={Flag}
				ariaLabel={safeT(t, 'aria.priority', 'Filter by priority')}
				widthClass="w-28 sm:w-36"
			/>

			{/* Date range — bordered inputs matching the trigger surface */}
			<DateInput
				icon
				value={value.dateFrom}
				onChange={(next) => onChange({ ...value, dateFrom: next })}
				ariaLabel={safeT(t, 'aria.dateFrom', 'From date')}
				placeholder={safeT(t, 'dateFrom', 'From')}
			/>
			<DateInput
				value={value.dateTo}
				onChange={(next) => onChange({ ...value, dateTo: next })}
				ariaLabel={safeT(t, 'aria.dateTo', 'To date')}
				placeholder={safeT(t, 'dateTo', 'To')}
			/>

			{hasFilters && (
				<button
					type="button"
					onClick={reset}
					className="inline-flex items-center gap-1 h-7 sm:h-8 px-2.5 text-[10px] sm:text-xs font-medium rounded-lg border border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/6 transition-colors"
				>
					<X className="h-3 w-3" aria-hidden="true" />
					{safeT(t, 'reset', 'Reset')}
				</button>
			)}
		</div>
	);
}

interface DateInputProps {
	value: string | null;
	onChange: (next: string | null) => void;
	ariaLabel: string;
	placeholder?: string;
	icon?: boolean;
}

function DateInput({ value, onChange, ariaLabel, icon }: DateInputProps) {
	return (
		<div className="relative">
			{icon && (
				<div className="pointer-events-none absolute inset-y-0 left-0 pl-2.5 flex items-center">
					<CalendarDays className="h-3 w-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
				</div>
			)}
			<input
				type="date"
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value || null)}
				aria-label={ariaLabel}
				className={cn(
					'h-7 sm:h-8 text-[10px] sm:text-xs font-medium',
					'rounded-lg border border-gray-300 dark:border-white/6',
					'bg-gray-50 dark:bg-white/4',
					'text-gray-900 dark:text-white',
					'hover:bg-gray-100 dark:hover:bg-white/6',
					'focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500',
					'transition-all duration-200',
					icon ? 'pl-7 pr-2' : 'px-2'
				)}
			/>
		</div>
	);
}

function humanise(type: NotificationType): string {
	return type
		.split('_')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(' ');
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
