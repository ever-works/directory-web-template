'use client';

import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
	NOTIFICATION_PRIORITIES,
	NOTIFICATION_TYPES,
	type NotificationPriority,
	type NotificationType
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

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
		value.q ||
		value.types.length > 0 ||
		value.priorities.length > 0 ||
		value.dateFrom ||
		value.dateTo;

	const selectClass =
		'h-8 px-2 text-xs rounded-md border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/6 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500';

	return (
		<div className={cn('flex flex-wrap items-center gap-2', className)}>
			<div className="relative w-full sm:w-64">
				<Search
					className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
					aria-hidden="true"
				/>
				<Input
					value={value.q}
					onChange={(e) => onChange({ ...value, q: e.target.value })}
					placeholder={safeT(t, 'searchPlaceholder', 'Search…')}
					className="h-8 pl-7 text-xs border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3"
					aria-label={safeT(t, 'aria.search', 'Search notifications')}
				/>
			</div>
			<select
				value={value.types[0] ?? ''}
				onChange={(e) =>
					onChange({ ...value, types: e.target.value ? [e.target.value as NotificationType] : [] })
				}
				className={selectClass}
				aria-label={safeT(t, 'aria.type', 'Filter by type')}
			>
				<option value="">{safeT(t, 'allTypes', 'All types')}</option>
				{NOTIFICATION_TYPES.map((type) => (
					<option key={type} value={type}>
						{humanise(type)}
					</option>
				))}
			</select>
			<select
				value={value.priorities[0] ?? ''}
				onChange={(e) =>
					onChange({
						...value,
						priorities: e.target.value ? [e.target.value as NotificationPriority] : []
					})
				}
				className={selectClass}
				aria-label={safeT(t, 'aria.priority', 'Filter by priority')}
			>
				<option value="">{safeT(t, 'allPriorities', 'All priorities')}</option>
				{NOTIFICATION_PRIORITIES.map((p) => (
					<option key={p} value={p}>
						{p.charAt(0).toUpperCase() + p.slice(1)}
					</option>
				))}
			</select>
			<input
				type="date"
				value={value.dateFrom ?? ''}
				onChange={(e) => onChange({ ...value, dateFrom: e.target.value || null })}
				className={selectClass}
				aria-label={safeT(t, 'aria.dateFrom', 'From date')}
			/>
			<input
				type="date"
				value={value.dateTo ?? ''}
				onChange={(e) => onChange({ ...value, dateTo: e.target.value || null })}
				className={selectClass}
				aria-label={safeT(t, 'aria.dateTo', 'To date')}
			/>
			{hasFilters && (
				<button
					type="button"
					onClick={reset}
					className="inline-flex items-center gap-1 h-8 px-2 text-xs font-medium rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6 transition-colors"
				>
					<X className="h-3 w-3" />
					{safeT(t, 'reset', 'Reset')}
				</button>
			)}
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
