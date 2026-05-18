'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Clock, Mail } from 'lucide-react';

import {
	NOTIFICATION_CATEGORIES,
	NOTIFICATION_CHANNELS,
	NOTIFICATION_REGISTRY,
	NOTIFICATION_TYPES,
	metaFor,
	type NotificationCategory,
	type NotificationChannel,
	type NotificationType
} from '@/lib/notifications';
import type { NotificationDigest, NotificationPreferencesPayload } from '@/lib/notifications/types';
import { cn } from '@/lib/utils';

import { NotificationSelect } from './notification-select';

interface NotificationPreferencesFormProps {
	initial: NotificationPreferencesPayload;
	onSave: (payload: NotificationPreferencesPayload) => void;
	isSaving?: boolean;
	className?: string;
}

const DIGEST_OPTIONS: NotificationDigest[] = ['instant', 'daily', 'weekly', 'off'];

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
	const cardBodyClass = 'px-6 py-5';
	const labelClass = 'text-xs font-medium text-neutral-600 dark:text-neutral-400';
	const timeInputClass =
		'h-7 sm:h-8 px-2.5 text-[10px] sm:text-xs font-medium rounded-lg border border-gray-300 dark:border-white/6 bg-gray-50 dark:bg-white/4 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/6 focus:outline-hidden focus:ring-2 focus:ring-theme-primary-500 transition-all duration-200';

	const digestOptions = DIGEST_OPTIONS.map((d) => ({
		value: d,
		label: safeT(t, `digest.${d}`, d.charAt(0).toUpperCase() + d.slice(1))
	}));

	return (
		<form
			className={cn('space-y-6', className)}
			onSubmit={(e) => {
				e.preventDefault();
				onSave(state);
			}}
		>
			<section className={cardClass}>
				<div className={cardHeaderClass}>
					<h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
						{safeT(t, 'globalTitle', 'Email & quiet hours')}
					</h2>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
						{safeT(t, 'globalSubtitle', 'How and when we contact you.')}
					</p>
				</div>
				<div className={cn(cardBodyClass, 'space-y-4')}>
					<div className="flex flex-wrap items-center gap-3">
						<span className={labelClass}>{safeT(t, 'emailDigest', 'Email digest')}</span>
						<NotificationSelect
							value={state.emailDigest}
							onChange={(next) => setState({ ...state, emailDigest: next as NotificationDigest })}
							options={digestOptions}
							placeholder={safeT(t, 'emailDigest', 'Email digest')}
							icon={Mail}
							ariaLabel={safeT(t, 'emailDigest', 'Email digest')}
							widthClass="w-32 sm:w-36"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<span className={labelClass}>{safeT(t, 'quietHoursStart', 'Quiet hours start')}</span>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 pl-2.5 flex items-center">
								<Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
							</div>
							<input
								id="quiet-from"
								type="time"
								value={state.quietHoursStart ?? ''}
								onChange={(e) => setState({ ...state, quietHoursStart: e.target.value || null })}
								className={cn(timeInputClass, 'pl-7 pr-2')}
								aria-label={safeT(t, 'quietHoursStart', 'Quiet hours start')}
							/>
						</div>
						<span className={labelClass}>{safeT(t, 'quietHoursEnd', 'Quiet hours end')}</span>
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 pl-2.5 flex items-center">
								<Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" aria-hidden="true" />
							</div>
							<input
								id="quiet-to"
								type="time"
								value={state.quietHoursEnd ?? ''}
								onChange={(e) => setState({ ...state, quietHoursEnd: e.target.value || null })}
								className={cn(timeInputClass, 'pl-7 pr-2')}
								aria-label={safeT(t, 'quietHoursEnd', 'Quiet hours end')}
							/>
						</div>
					</div>
				</div>
			</section>

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
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-white/8">
										<th className="px-6 py-2.5 font-medium">{safeT(t, 'columnEvent', 'Event')}</th>
										{NOTIFICATION_CHANNELS.map((ch) => (
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
												{NOTIFICATION_CHANNELS.map((ch) => {
													const disabled = meta.locked && ch === 'in_app';
													const supported = ch !== 'sms';
													return (
														<td key={ch} className="px-3 py-2.5 text-center">
															<input
																type="checkbox"
																checked={isChecked(type, ch)}
																disabled={disabled || !supported}
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
		sponsorship: [],
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
	return channel === 'in_app' ? 'In-app' : channel.toUpperCase();
}

function safeT(t: ReturnType<typeof useTranslations>, key: string, fallback: string): string {
	try {
		const v = t(key);
		return v && v !== key ? v : fallback;
	} catch {
		return fallback;
	}
}
