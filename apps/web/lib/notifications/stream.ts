/**
 * Spec 027 — the Server-Sent Events stream behind GET /api/client/notifications/stream.
 *
 * Kept free of NextAuth, the database and Next.js so it runs under `tsx --test`
 * (lib/notifications/__tests__/stream-session-ends.spec.ts); the route handler supplies the user,
 * the pub/sub subscription and the session check.
 */

import { passwordVersionOf } from '../auth/password-change';
import type { NotificationListItem } from './types';

/** Spec 027 AC-15: a ping every 25 s keeps the connection open through proxies. */
export const NOTIFICATION_STREAM_HEARTBEAT_MS = 25_000;

/** What the stream's session held when the stream opened. */
export interface NotificationStreamSession {
	/** `passwordVersionOf(users.password_changed_at)`, read when the stream opened. */
	passwordVersion: number | null;
	/** The session's `isDeactivated` claim (synced from `users.deactivated_at` by `auth()`). */
	deactivated: boolean;
	/** `users.deactivated_at` in ms, or `null`, read with `passwordVersion`. */
	deactivatedAt: number | null;
}

/** The `users` columns a ping re-reads (`getUserSessionState` in lib/db/queries/user.queries.ts). */
export interface UserSessionState {
	passwordChangedAt: Date | null;
	deactivatedAt: Date | null;
}

/**
 * Whether the session a stream opened with still holds, given the user's current state.
 *
 * A password reset or change ends every session that signed in before it (spec-003 AC-9,
 * `sessionPredatesPasswordChange` in lib/auth/password-change.ts). A stream opened after its
 * session was checked, so any change of the password version since the stream opened is later
 * than that sign-in, and the jwt callback ends the session: the stream ends with it. A missing
 * users row reads as no recorded change (`passwordVersionOf(undefined)`), as in the jwt callback.
 *
 * Deactivating an account signs that browser out; the stream ends when the account is
 * deactivated by a deactivation it did not open under: the session's claim said active, or
 * `deactivated_at` is not the value read when the stream opened (deactivated again after a
 * reactivation). A stream whose session was already deactivated when it opened is kept while that
 * deactivation lasts, as `auth()` keeps the session, so it does not end and reconnect on every ping.
 */
export function notificationStreamSessionHolds(
	opened: NotificationStreamSession,
	now: UserSessionState | undefined
): boolean {
	const deactivatedAt = now?.deactivatedAt ? now.deactivatedAt.getTime() : null;
	if (deactivatedAt !== null && (!opened.deactivated || deactivatedAt !== opened.deactivatedAt)) return false;
	return passwordVersionOf(now?.passwordChangedAt) === opened.passwordVersion;
}

export interface NotificationStreamOptions {
	userId: string;
	/** The request's signal: the client disconnected. */
	signal: AbortSignal;
	subscribe: (userId: string, listener: (notification: NotificationListItem) => void) => () => void;
	/**
	 * Runs on every heartbeat, before the ping. `false`, or a rejection (fails closed, like the jwt
	 * callback on an unreadable `password_changed_at`), closes the stream; the browser's EventSource
	 * then reconnects through `auth()`, which answers 401 for an ended session.
	 */
	sessionStillHolds: () => Promise<boolean>;
}

/**
 * Sends `hello`, then a `notification` event for each notification published for the user, and
 * a `ping` every 25 s while the session still holds. Closes when the client disconnects (the
 * request is aborted or the body is cancelled) or when the session check fails.
 */
export function createNotificationStream(options: NotificationStreamOptions): ReadableStream<Uint8Array> {
	const { userId, signal, subscribe, sessionStillHolds } = options;
	let stop = () => {};

	return new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			let closed = false;
			let checking = false;

			const send = (event: string, data: unknown) => {
				if (closed) return;
				try {
					controller.enqueue(
						encoder.encode(`event: ${event}
data: ${JSON.stringify(data)}

`)
					);
				} catch {
					// Controller may already be closed (client disconnect race).
				}
			};

			// Initial hello so the client knows the stream is live.
			send('hello', { userId, ts: Date.now() });

			const unsubscribe = subscribe(userId, (n) => {
				send('notification', n);
			});

			// Each ping reads the database, so every way the stream ends stops the heartbeat.
			const heartbeat = setInterval(() => {
				// A check still running (slow database) covers this ping too.
				if (checking || closed) return;
				checking = true;
				sessionStillHolds().then(
					(holds) => {
						checking = false;
						if (holds) send('ping', { t: Date.now() });
						else stop();
					},
					() => {
						checking = false;
						stop();
					}
				);
			}, NOTIFICATION_STREAM_HEARTBEAT_MS);

			stop = () => {
				if (closed) return;
				closed = true;
				clearInterval(heartbeat);
				unsubscribe();
				try {
					controller.close();
				} catch {
					// already closed (cancelled by the client)
				}
			};

			signal.addEventListener('abort', stop);
			if (signal.aborted) stop();
		},
		cancel() {
			stop();
		}
	});
}
