import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * T-2648: `GET /api/client/notifications/stream` checked `auth()` once, when it connected, and then
 * kept the stream open with a ping every 25 s, with no end on a long-running server. A password
 * reset or change ends the user's older sessions (spec-003 AC-9, #1147), but a stream opened by
 * such a session kept pushing the user's notifications until the client closed it; only a
 * reconnect got 401. The same held for a session whose account was deactivated.
 *
 * The stream now re-reads the user's `password_changed_at` and `deactivated_at` on every ping and
 * closes when the password version differs from the one it opened with, or when the account was
 * deactivated after it opened; the browser's EventSource then reconnects through `auth()`.
 *
 * `lib/notifications/stream.ts` is loaded directly (it imports no NextAuth, database or Next.js).
 * The route handler and the query import NextAuth or the database and cannot be loaded under
 * `tsx --test`, so their guards read the source (as in
 * `lib/auth/__tests__/password-change-ends-sessions.spec.ts`).
 */

const WEB = join(__dirname, '../../..');

/** Code only, on one line: block comments and whole-line `//` comments are dropped. */
const code = (relative: string) =>
	readFileSync(join(WEB, relative), 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/^\s*\/\/.*$/gm, ' ')
		.replace(/\s+/g, ' ');

type Listener = (notification: unknown) => void;

interface StreamOptions {
	userId: string;
	signal: AbortSignal;
	subscribe: (userId: string, listener: Listener) => () => void;
	sessionStillHolds: () => Promise<boolean>;
}

interface OpenedSession {
	passwordVersion: number | null;
	deactivated: boolean;
	deactivatedAt: number | null;
}

interface UserSessionState {
	passwordChangedAt: Date | null;
	deactivatedAt: Date | null;
}

interface StreamModule {
	NOTIFICATION_STREAM_HEARTBEAT_MS: number;
	createNotificationStream: (options: StreamOptions) => ReadableStream<Uint8Array>;
	notificationStreamSessionHolds: (opened: OpenedSession, now: UserSessionState | undefined) => boolean;
}

/** Loaded per test, so a missing module fails each test on its own. */
const loadStream = async (): Promise<StreamModule> => {
	const mod = (await import('../stream')) as Partial<StreamModule>;
	assert.equal(typeof mod.createNotificationStream, 'function', 'createNotificationStream is not exported');
	assert.equal(
		typeof mod.notificationStreamSessionHolds,
		'function',
		'notificationStreamSessionHolds is not exported'
	);
	assert.equal(mod.NOTIFICATION_STREAM_HEARTBEAT_MS, 25_000, 'the heartbeat is not 25 s (spec-027 AC-15)');
	return mod as StreamModule;
};

/** Lets pending promise callbacks (the session check, the reader) run. */
const flush = async () => {
	for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};

/** Reads the stream in the background and records the SSE event names and whether it closed. */
const collect = (stream: ReadableStream<Uint8Array>) => {
	const state = { events: [] as string[], closed: false };
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	void (async () => {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				state.closed = true;
				return;
			}
			for (const match of decoder.decode(value).matchAll(/^event: (\w+)$/gm)) state.events.push(match[1]);
		}
	})();
	return state;
};

/** A subscribe stand-in that records its listeners and unsubscribe calls. */
const fakePubSub = () => {
	const listeners = new Set<Listener>();
	return {
		listeners,
		subscribe: (_userId: string, listener: Listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		publish: (notification: unknown) => {
			for (const listener of listeners) listener(notification);
		}
	};
};

describe('notifications stream: the session is re-checked on every ping (T-2648)', () => {
	const aborts: AbortController[] = [];

	beforeEach(() => {
		mock.timers.enable({ apis: ['setInterval'] });
	});

	afterEach(() => {
		for (const abort of aborts.splice(0)) abort.abort();
		mock.timers.reset();
	});

	const open = (mod: StreamModule, sessionStillHolds: () => Promise<boolean>) => {
		const abort = new AbortController();
		aborts.push(abort);
		const pubsub = fakePubSub();
		const stream = mod.createNotificationStream({
			userId: 'user-1',
			signal: abort.signal,
			subscribe: pubsub.subscribe,
			sessionStillHolds
		});
		return { abort, pubsub, state: collect(stream) };
	};

	it('closes a stream whose session ended (password changed) within one ping interval', async () => {
		const mod = await loadStream();
		let holds = true;
		let checks = 0;
		const { pubsub, state } = open(mod, async () => {
			checks++;
			return holds;
		});
		await flush();
		assert.deepEqual(state.events, ['hello']);
		assert.equal(pubsub.listeners.size, 1);

		// The password is reset in another browser: the next ping's check fails.
		holds = false;
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS - 1);
		await flush();
		assert.equal(state.closed, false, 'closed before the ping');
		mock.timers.tick(1);
		await flush();

		assert.equal(checks, 1);
		assert.equal(state.closed, true, 'the stream stayed open after its session ended');
		assert.deepEqual(state.events, ['hello'], 'a ping was sent for an ended session');
		assert.equal(pubsub.listeners.size, 0, 'the notification listener was not removed');

		// No further checks or pings once closed.
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS * 3);
		await flush();
		assert.equal(checks, 1, 'the heartbeat kept running after the stream closed');
	});

	it('keeps a normal stream open, pinging and delivering notifications', async () => {
		const mod = await loadStream();
		let checks = 0;
		const { pubsub, state } = open(mod, async () => {
			checks++;
			return true;
		});
		await flush();

		for (let i = 0; i < 3; i++) {
			mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS);
			await flush();
		}
		pubsub.publish({ id: 'n-1', title: 'Hello' });
		await flush();

		assert.equal(checks, 3, 'the session is not re-checked on every ping');
		assert.equal(state.closed, false);
		assert.deepEqual(state.events, ['hello', 'ping', 'ping', 'ping', 'notification']);
		assert.equal(pubsub.listeners.size, 1);
	});

	it('closes the stream when the check fails (fails closed, like the jwt callback)', async () => {
		const mod = await loadStream();
		const { pubsub, state } = open(mod, async () => {
			throw new Error('database unavailable');
		});
		await flush();
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS);
		await flush();

		assert.equal(state.closed, true, 'a failed check kept the stream open');
		assert.deepEqual(state.events, ['hello']);
		assert.equal(pubsub.listeners.size, 0);
	});

	it('closes the stream when a check has not settled by the next ping, without starting a second one', async () => {
		const mod = await loadStream();
		let checks = 0;
		let release: (holds: boolean) => void = () => {};
		const { pubsub, state } = open(
			mod,
			() =>
				new Promise<boolean>((resolve) => {
					checks++;
					release = resolve;
				})
		);
		await flush();
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS);
		await flush();
		assert.equal(checks, 1);
		assert.equal(state.closed, false, 'closed while the first check was still within its interval');

		// The read stalls: the next heartbeat closes the stream instead of waiting on it.
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS);
		await flush();
		assert.equal(checks, 1, 'a second check started while one was still running');
		assert.equal(state.closed, true, 'a stalled check kept the stream open');
		assert.equal(pubsub.listeners.size, 0, 'a stalled check kept delivering notifications');

		// The stalled check settling later sends nothing.
		release(true);
		await flush();
		assert.deepEqual(state.events, ['hello']);
	});

	it('still closes and unsubscribes when the client disconnects', async () => {
		const mod = await loadStream();
		let checks = 0;
		const { abort, pubsub, state } = open(mod, async () => {
			checks++;
			return true;
		});
		await flush();
		abort.abort();
		await flush();
		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS * 2);
		await flush();

		assert.equal(state.closed, true);
		assert.equal(pubsub.listeners.size, 0);
		assert.equal(checks, 0, 'the heartbeat kept running after the client disconnected');
	});

	it('stops the heartbeat when the body is cancelled or the request was already aborted', async () => {
		const mod = await loadStream();
		let checks = 0;
		const sessionStillHolds = async () => {
			checks++;
			return true;
		};

		const cancelled = fakePubSub();
		const abort = new AbortController();
		aborts.push(abort);
		const stream = mod.createNotificationStream({
			userId: 'user-1',
			signal: abort.signal,
			subscribe: cancelled.subscribe,
			sessionStillHolds
		});
		await stream.getReader().cancel();

		const aborted = fakePubSub();
		const gone = new AbortController();
		gone.abort();
		mod.createNotificationStream({
			userId: 'user-1',
			signal: gone.signal,
			subscribe: aborted.subscribe,
			sessionStillHolds
		});

		mock.timers.tick(mod.NOTIFICATION_STREAM_HEARTBEAT_MS * 2);
		await flush();
		assert.equal(checks, 0, 'the heartbeat kept reading the session for a stream nobody reads');
		assert.equal(cancelled.listeners.size, 0);
		assert.equal(aborted.listeners.size, 0);
	});
});

describe('notificationStreamSessionHolds: the rule a ping applies (T-2648)', () => {
	const at = (ms: number) => new Date(ms);
	const state = (passwordChangedAt: Date | null, deactivatedAt: Date | null = null) => ({
		passwordChangedAt,
		deactivatedAt
	});
	/** What the stream opened with: the password version, the session's claim, `deactivated_at`. */
	const opened = (passwordVersion: number | null, deactivated = false, deactivatedAt: number | null = null) => ({
		passwordVersion,
		deactivated,
		deactivatedAt
	});

	it('holds while the password version and the deactivation state are unchanged', async () => {
		const { notificationStreamSessionHolds: holds } = await loadStream();
		assert.equal(holds(opened(null), state(null)), true);
		assert.equal(holds(opened(1_000), state(at(1_000))), true);
	});

	it('ends when the password was reset or changed after the stream opened', async () => {
		const { notificationStreamSessionHolds: holds } = await loadStream();
		// First change since the rollout (the column was NULL).
		assert.equal(holds(opened(null), state(at(5_000))), false);
		// A later change.
		assert.equal(holds(opened(1_000), state(at(5_000))), false);
	});

	it('ends when the account was deactivated after the stream opened', async () => {
		const { notificationStreamSessionHolds: holds } = await loadStream();
		assert.equal(holds(opened(null), state(null, at(9_000))), false);
		// Deactivated after auth() but before the opening read: the session's claim still said active.
		assert.equal(holds(opened(null, false, 9_000), state(null, at(9_000))), false);
	});

	it('keeps a stream opened under the same deactivation, ends it on a new one', async () => {
		const { notificationStreamSessionHolds: holds } = await loadStream();
		// auth() keeps a deactivated session, so its stream is kept while that deactivation lasts...
		assert.equal(holds(opened(null, true, 9_000), state(null, at(9_000))), true);
		// ...and after a reactivation,
		assert.equal(holds(opened(null, true, 9_000), state(null)), true);
		// but a deactivation after that one ends it (reactivated, then deactivated again).
		assert.equal(holds(opened(null, true, 9_000), state(null, at(12_000))), false);
		// Reactivated between auth() and the opening read: any deactivation after it ends the stream.
		assert.equal(holds(opened(null, true, null), state(null, at(12_000))), false);
	});

	it('treats a missing users row as no recorded change, like the jwt callback', async () => {
		const { notificationStreamSessionHolds: holds } = await loadStream();
		assert.equal(holds(opened(null), undefined), true);
		assert.equal(holds(opened(1_000), undefined), false);
	});
});

describe('GET /api/client/notifications/stream wiring (T-2648)', () => {
	const ROUTE = 'app/api/client/notifications/stream/route.ts';

	it('builds the stream with a session check that re-reads the user state', () => {
		const route = code(ROUTE);
		assert.ok(route.includes('createNotificationStream('), 'the route does not use createNotificationStream');
		assert.ok(route.includes('sessionStillHolds:'), 'the route passes no sessionStillHolds check');
		assert.ok(
			/sessionStillHolds: async \(\) => notificationStreamSessionHolds\(opened, await getUserSessionState\(userId\)\)/.test(
				route
			),
			'the check does not re-read getUserSessionState and apply notificationStreamSessionHolds'
		);
		assert.ok(!route.includes('setInterval('), 'the route still runs its own heartbeat');
	});

	it('reads the opening password version before a second auth(), so a change in between is not missed', () => {
		const route = code(ROUTE);
		const firstAuth = route.indexOf('await auth()');
		const baseline = route.indexOf('await getUserSessionState(userId)');
		const secondAuth = route.indexOf('await auth()', firstAuth + 1);
		assert.ok(firstAuth >= 0, 'auth() not found');
		assert.ok(baseline > firstAuth, 'the opening user state is not read after auth()');
		assert.ok(secondAuth > baseline, 'auth() is not run again after the opening user state is read');
		assert.ok(
			route.includes('passwordVersion: passwordVersionOf('),
			'the opening password version does not use passwordVersionOf'
		);
		assert.ok(
			route.includes('deactivated: session.user.isDeactivated === true'),
			'the opening deactivation state is not the claim of the first auth()'
		);
		assert.ok(
			route.includes('deactivatedAt: state?.deactivatedAt ? state.deactivatedAt.getTime() : null'),
			'the opening deactivated_at is not recorded'
		);
	});

	it('getUserSessionState reads password_changed_at and deactivated_at by user id', () => {
		const queries = code('lib/db/queries/user.queries.ts');
		const start = queries.indexOf('export async function getUserSessionState(');
		assert.ok(start >= 0, 'getUserSessionState is not exported from user.queries.ts');
		const body = queries.slice(start, queries.indexOf(' export ', start + 1));
		assert.ok(
			body.includes('passwordChangedAt: users.passwordChangedAt') &&
				body.includes('deactivatedAt: users.deactivatedAt'),
			'getUserSessionState does not read both columns'
		);
		assert.ok(body.includes('eq(users.id, userId)'), 'getUserSessionState does not read by user id');
	});
});
