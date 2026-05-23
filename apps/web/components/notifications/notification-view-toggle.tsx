'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export type NotificationView = 'list' | 'grid';

interface NotificationViewToggleProps {
	value: NotificationView;
	onChange: (next: NotificationView) => void;
	className?: string;
}

/**
 * Segmented icon-button pair matching the trigger shell used elsewhere
 * (header buttons, bulk action row).  Reads `aria-pressed` so the
 * active button is announced to assistive tech.
 */
export function NotificationViewToggle({ value, onChange, className }: NotificationViewToggleProps) {
	const t = useTranslations('client.notifications.view');

	return (
		<div
			role="group"
			aria-label={safeT(t, 'aria.group', 'Toggle layout')}
			className={cn(
				'inline-flex items-center rounded-lg border border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 p-0.5',
				className
			)}
		>
			<ToggleButton
				icon={<List className="h-3.5 w-3.5" aria-hidden="true" />}
				label={safeT(t, 'list', 'List view')}
				active={value === 'list'}
				onClick={() => onChange('list')}
			/>
			<ToggleButton
				icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />}
				label={safeT(t, 'grid', 'Grid view')}
				active={value === 'grid'}
				onClick={() => onChange('grid')}
			/>
		</div>
	);
}

interface ToggleButtonProps {
	icon: React.ReactNode;
	label: string;
	active: boolean;
	onClick: () => void;
}

function ToggleButton({ icon, label, active, onClick }: ToggleButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			aria-label={label}
			title={label}
			className={cn(
				'inline-flex h-6 sm:h-7 w-7 items-center justify-center rounded-md transition-colors duration-150',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500',
				active
					? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
					: 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
			)}
		>
			{icon}
		</button>
	);
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
