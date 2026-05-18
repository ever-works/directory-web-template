'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
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

interface NotificationPreferencesFormProps {
	initial: NotificationPreferencesPayload;
	onSave: (payload: NotificationPreferencesPayload) => void;
	isSaving?: boolean;
	className?: string;
}

const DIGEST_OPTIONS: NotificationDigest[] = ['instant', 'daily', 'weekly', 'off'];

export function NotificationPreferencesForm({ initial, onSave, isSaving, className }: NotificationPreferencesFormProps) {
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

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			onSubmit={(e) => {
				e.preventDefault();
				onSave(state);
			}}
		>
			<section className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
				<h2 className="text-sm font-semibold">{safeT(t, 'globalTitle', 'Email & quiet hours')}</h2>

				<div className="flex flex-wrap items-center gap-3">
					<label className="text-xs text-muted-foreground" htmlFor="digest">
						{safeT(t, 'emailDigest', 'Email digest')}
					</label>
					<select
						id="digest"
						value={state.emailDigest}
						onChange={(e) => setState({ ...state, emailDigest: e.target.value as NotificationDigest })}
						className="h-8 rounded-md border border-input bg-background px-2 text-xs"
					>
						{DIGEST_OPTIONS.map((d) => (
							<option key={d} value={d}>
								{safeT(t, `digest.${d}`, d.charAt(0).toUpperCase() + d.slice(1))}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<label className="text-xs text-muted-foreground" htmlFor="quiet-from">
						{safeT(t, 'quietHoursStart', 'Quiet hours start')}
					</label>
					<input
						id="quiet-from"
						type="time"
						value={state.quietHoursStart ?? ''}
						onChange={(e) => setState({ ...state, quietHoursStart: e.target.value || null })}
						className="h-8 rounded-md border border-input bg-background px-2 text-xs"
					/>
					<label className="text-xs text-muted-foreground" htmlFor="quiet-to">
						{safeT(t, 'quietHoursEnd', 'Quiet hours end')}
					</label>
					<input
						id="quiet-to"
						type="time"
						value={state.quietHoursEnd ?? ''}
						onChange={(e) => setState({ ...state, quietHoursEnd: e.target.value || null })}
						className="h-8 rounded-md border border-input bg-background px-2 text-xs"
					/>
				</div>
			</section>

			{NOTIFICATION_CATEGORIES.map((category) => {
				const items = grouped[category];
				if (items.length === 0) return null;
				return (
					<section key={category} className="flex flex-col gap-2 rounded-md border border-border bg-card p-4">
						<h2 className="text-sm font-semibold">{safeT(t, `category.${category}`, fallbackCategory(category))}</h2>
						<div className="overflow-x-auto">
							<table className="w-full table-auto text-xs">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="py-2 font-medium">{safeT(t, 'columnEvent', 'Event')}</th>
										{NOTIFICATION_CHANNELS.map((ch) => (
											<th key={ch} className="px-2 py-2 text-center font-medium">
												{safeT(t, `channel.${ch}`, fallbackChannel(ch))}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{items.map((type) => {
										const meta = NOTIFICATION_REGISTRY[type];
										return (
											<tr key={type} className="border-t border-border">
												<td className="py-2">
													<div className="flex flex-col">
														<span className="font-medium text-foreground">{humanise(type)}</span>
														{meta.locked && (
															<span className="text-[10px] text-muted-foreground">
																{safeT(t, 'lockedHint', 'Required for account safety')}
															</span>
														)}
													</div>
												</td>
												{NOTIFICATION_CHANNELS.map((ch) => {
													const disabled = meta.locked && ch === 'in_app';
													const supported = ch !== 'sms'; // SMS not yet wired
													return (
														<td key={ch} className="px-2 py-2 text-center">
															<input
																type="checkbox"
																checked={isChecked(type, ch)}
																disabled={disabled || !supported}
																onChange={(e) => toggle(type, ch, e.target.checked)}
																aria-label={`${ch} for ${type}`}
																className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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

			<div className="flex justify-end gap-2">
				<Button type="submit" disabled={isSaving}>
					{isSaving ? safeT(t, 'saving', 'Saving…') : safeT(t, 'save', 'Save preferences')}
				</Button>
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
