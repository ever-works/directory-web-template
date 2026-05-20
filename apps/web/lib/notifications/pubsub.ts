/**
 * Spec 027 — Notification pub/sub.
 *
 * In-memory pub/sub keyed by user id. Used by the SSE route to receive
 * fresh notifications dispatched in the same process.
 *
 * Multi-pod deployments need a Redis-backed implementation: when
 * `REDIS_URL` is set, callers should swap this module for a Redis
 * adapter. We keep the in-memory fallback because the directory
 * template ships standalone on a single-pod cluster by default.
 *
 * Intentional: events are NOT buffered. If no listener is attached the
 * event is dropped — the canonical record is the DB row, and the
 * client refetches on reconnect.
 */

import { EventEmitter } from 'events';
import type { NotificationListItem } from './types';

type Listener = (notification: NotificationListItem) => void;

class NotificationPubSub {
	private emitter = new EventEmitter();

	constructor() {
		// Each user can have at most a few tabs open; keep some headroom.
		this.emitter.setMaxListeners(32);
	}

	subscribe(userId: string, listener: Listener): () => void {
		const channel = this.channel(userId);
		this.emitter.on(channel, listener);
		return () => {
			this.emitter.off(channel, listener);
		};
	}

	publish(userId: string, notification: NotificationListItem): void {
		this.emitter.emit(this.channel(userId), notification);
	}

	private channel(userId: string): string {
		return `notif:${userId}`;
	}
}

// Module-level singleton (per-process).
declare global {
	var __notificationPubSub: NotificationPubSub | undefined;
}

export const notificationPubSub: NotificationPubSub =
	globalThis.__notificationPubSub ?? (globalThis.__notificationPubSub = new NotificationPubSub());
