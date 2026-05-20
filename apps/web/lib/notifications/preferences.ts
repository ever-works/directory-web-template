/**
 * Spec 027 — Preference resolution.
 *
 * Given a user's stored matrix + a notification type, return the
 * channels that should actually fire. Honors:
 *   - locked types (registry.locked === true) — in_app always on.
 *   - explicit per-type user overrides.
 *   - registry defaults when the user has no preference set.
 *   - email digest cadence (`instant` lets email through; `daily`,
 *     `weekly`, `off` defer/suppress email — the digest worker will
 *     pick up the row later).
 *   - quiet hours — only mutes `push` (in_app and email pass through).
 *
 * Pure function so it's trivially unit-testable.
 */

import { metaFor, type NotificationChannel, type NotificationType } from './registry';
import type { NotificationDigest, NotificationPreferencesMap } from './types';

export interface ResolveOptions {
	type: NotificationType;
	userPreferences: NotificationPreferencesMap;
	emailDigest: NotificationDigest;
	quietHours?: { start: string | null; end: string | null; timezone: string };
	pushEnabled: boolean;
	/** ISO timestamp; defaults to `now`. Injectable for tests. */
	now?: Date;
}

export interface ResolvedChannels {
	channels: NotificationChannel[];
	/** True if the in_app channel was kept open by a locked-type bypass. */
	bypassedPreferences: boolean;
}

export function resolveChannels(opts: ResolveOptions): ResolvedChannels {
	const meta = metaFor(opts.type);
	if (!meta) {
		return { channels: ['in_app'], bypassedPreferences: false };
	}

	const userMatrix = opts.userPreferences[opts.type] ?? {};
	const channels = new Set<NotificationChannel>();
	let bypassed = false;

	for (const ch of ['in_app', 'email', 'push', 'sms'] as NotificationChannel[]) {
		const userSet = userMatrix[ch];
		const def = meta.defaultChannels[ch] ?? false;
		const enabled = userSet ?? def;
		if (enabled) channels.add(ch);
	}

	// Locked types — guarantee in_app even if the user toggled it off in stored data.
	if (meta.locked && !channels.has('in_app')) {
		channels.add('in_app');
		bypassed = true;
	}

	// Email digest gating.
	if (channels.has('email') && opts.emailDigest !== 'instant') {
		channels.delete('email');
		// For non-locked types, also drop email when digest is 'off'.
		// (Digest worker reads the DB row directly for daily / weekly.)
		if (meta.locked && opts.emailDigest !== 'off') {
			channels.add('email');
		}
	}

	// Push respects `pushEnabled` + quiet hours.
	if (channels.has('push')) {
		if (!opts.pushEnabled) {
			channels.delete('push');
		} else if (opts.quietHours && isInQuietHours(opts.now ?? new Date(), opts.quietHours)) {
			// Critical / locked types ignore quiet hours.
			if (!meta.locked && meta.priority !== 'critical') {
				channels.delete('push');
			}
		}
	}

	return { channels: Array.from(channels), bypassedPreferences: bypassed };
}

export function isInQuietHours(
	at: Date,
	hours: { start: string | null; end: string | null; timezone: string }
): boolean {
	if (!hours.start || !hours.end) return false;
	const minutes = toLocalMinutes(at, hours.timezone);
	const start = parseHHmm(hours.start);
	const end = parseHHmm(hours.end);
	if (start === null || end === null) return false;
	if (start === end) return false;
	if (start < end) return minutes >= start && minutes < end;
	// Crosses midnight (e.g. 22:00 → 07:00).
	return minutes >= start || minutes < end;
}

function parseHHmm(s: string): number | null {
	const match = /^([0-2]\d):([0-5]\d)$/.exec(s.trim());
	if (!match) return null;
	const h = Number.parseInt(match[1]!, 10);
	const m = Number.parseInt(match[2]!, 10);
	if (Number.isNaN(h) || Number.isNaN(m) || h > 23) return null;
	return h * 60 + m;
}

function toLocalMinutes(date: Date, timezone: string): number {
	try {
		// `formatToParts` is the only way to get TZ-aware hour/minute in pure JS.
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		const parts = fmt.formatToParts(date);
		const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
		const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
		return hour * 60 + minute;
	} catch {
		// Invalid timezone — fall back to UTC.
		return date.getUTCHours() * 60 + date.getUTCMinutes();
	}
}
