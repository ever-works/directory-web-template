'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
	NOTIFICATION_CATEGORIES,
	NOTIFICATION_REGISTRY,
	NOTIFICATION_TYPES,
	metaFor,
	type NotificationCategory,
	type NotificationChannel,
	type NotificationType
} from '@/lib/notifications';
import type { NotificationPreferencesPayload } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

interface NotificationPreferencesFormProps {
	initial: NotificationPreferencesPayload;
	onSave: (payload: NotificationPreferencesPayload) => void;
	isSaving?: boolean;
	className?: string;
}

// Only in-app and push are user-configurable; email and sms are removed from the UI.
const ACTIVE_CHANNELS: NotificationChannel[] = ['in_app', 'push'];

export function NotificationPreferencesForm({
	initial,
	onSave,
	isSaving,
	className
}: NotificationPreferencesFormProps) {
	const t = useTranslations('client.notifications.preferences');
	const [state, setState] = useState<NotificationPreferencesPayload>(initial);

	useEffect(() => {
		setState(initial);
	}, [initial]);

	const grouped = useMemo(() => groupByCategory(), []);

	const toggle = (type: NotificationType, channel: NotificationChannel, on: boolean) => {
		setState((current) => ({
			...current,
			preferences: {
				...current.preferences,
				[type]: { ...(current.preferences[type] ?? {}), [channel]: on }
			}
		}));
	};

	const isChecked = (type: NotificationType, channel: NotificationChannel): boolean => {
		const override = state.preferences[type]?.[channel];
		if (typeof override === 'boolean') return override;
		return Boolean(metaFor(type)?.defaultChannels[channel]);
	};

	const cardClass =
		'rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3';
	const cardHeaderClass = 'px-6 pt-5 pb-3 border-b border-neutral-200 dark:border-white/8';

	return (
		<form
			className={cn('space-y-6', className)}
			onSubmit={(e) => {
				e.preventDefault();
				onSave(state);
			}}
		>
			{NOTIFICATION_CATEGORIES.map((category) => {
				const items = grouped[category];
				if (items.length === 0) return null;
				return (
					<section key={category} className={cardClass}>
						<div className={cardHeaderClass}>
							<h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
								{safeT(t, `category.${category}`, fallbackCategory(category))}
							</h2>
						</div>
						<div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400/40 dark:scrollbar-thumb-gray-500/40 scrollbar-thumb-rounded-full [&::-webkit-scrollbar]:h-1">
							<table className="w-full text-xs">
								<thead>
									<tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-white/8">
										<th className="px-6 py-2.5 font-medium">{safeT(t, 'columnEvent', 'Event')}</th>
										{ACTIVE_CHANNELS.map((ch) => (
											<th key={ch} className="px-3 py-2.5 text-center font-medium">
												{safeT(t, `channel.${ch}`, fallbackChannel(ch))}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{items.map((type) => {
										const meta = NOTIFICATION_REGISTRY[type];
										return (
											<tr
												key={type}
												className="border-b border-neutral-100 dark:border-white/5 last:border-b-0"
											>
												<td className="px-6 py-2.5">
													<div className="flex flex-col">
														<span className="font-medium text-neutral-900 dark:text-white">
															{humanise(type)}
														</span>
														{meta.locked && (
															<span className="text-[11px] text-neutral-500 dark:text-neutral-400">
																{safeT(t, 'lockedHint', 'Required for account safety')}
															</span>
														)}
													</div>
												</td>
												{ACTIVE_CHANNELS.map((ch) => {
													const disabled = meta.locked && ch === 'in_app';
													return (
														<td key={ch} className="px-3 py-2.5 text-center">
															<input
																type="checkbox"
																checked={isChecked(type, ch)}
																disabled={disabled}
																onChange={(e) => toggle(type, ch, e.target.checked)}
																aria-label={`${ch} for ${type}`}
																className="h-3.5 w-3.5 cursor-pointer accent-neutral-900 dark:accent-white disabled:cursor-not-allowed disabled:opacity-40"
															/>
														</td>
													);
												})}
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</section>
				);
			})}

			<div className="flex justify-end">
				<button
					type="submit"
					disabled={isSaving}
					className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isSaving ? safeT(t, 'saving', 'Saving…') : safeT(t, 'save', 'Save preferences')}
				</button>
			</div>
		</form>
	);
}

function groupByCategory(): Record<NotificationCategory, NotificationType[]> {
	const out: Record<NotificationCategory, NotificationType[]> = {
		social: [],
		item: [],
		moderation: [],
		billing: [],
		account: [],
		system: []
	};
	for (const type of NOTIFICATION_TYPES) {
		const meta = NOTIFICATION_REGISTRY[type];
		out[meta.category].push(type);
	}
	return out;
}

function humanise(type: NotificationType): string {
	return type
		.split('_')
		.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
		.join(' ');
}

function fallbackCategory(category: NotificationCategory): string {
	return category.charAt(0).toUpperCase() + category.slice(1);
}

function fallbackChannel(channel: NotificationChannel): string {
	return channel === 'in_app' ? 'In-app' : channel.charAt(0).toUpperCase() + channel.slice(1);
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
