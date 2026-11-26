import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The per-email sign-in password budget (5 failed attempts per 15 minutes) is spent on one key by
 * two callers: `signInAction` (`app/[locale]/auth/actions.ts`, a server action) and the credentials
 * provider's `authorize` (`lib/auth/credentials.ts`, run by the NextAuth route handler). The bundler
 * loads `lib/utils/rate-limit.ts` once per layer, so the action and the route handler each get their
 * own copy of the module. When each copy kept its own map, each counted the key on its own: five
 * wrong passwords through the form left the callback with a fresh budget, so an attacker had ten
 * guesses per window, and the right password posted to the callback still got a session (T-2844).
 *
 * The store now lives on `globalThis`, so every copy of the module in the process shares it. Each
 * copy here is a separate instance of the module (its require-cache entry is dropped before it is
 * loaded again), the way the bundler's layers load it.
 *
 * The module starts a cleanup `setInterval` when it loads, so it is loaded only after the timers
 * (and `Date`) are mocked; the fake interval keeps the test process from hanging.
 */
type RateLimitModule = typeof import('../rate-limit');

const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;
const modulePath = require.resolve('../rate-limit');

let intervalsStarted = 0;
let first: RateLimitModule;
let second: RateLimitModule;

/** A new instance of `rate-limit.ts`, as another bundler layer would load it. */
function loadSeparateCopy(): RateLimitModule {
	delete require.cache[modulePath];
	return require('../rate-limit') as RateLimitModule;
}

before(() => {
	mock.timers.enable({ apis: ['setInterval', 'Date'], now: 1_000_000 });
	const fakeSetInterval = globalThis.setInterval;
	mock.method(globalThis, 'setInterval', ((...args: Parameters<typeof setInterval>) => {
		intervalsStarted++;
		return fakeSetInterval(...args);
	}) as typeof setInterval);

	first = loadSeparateCopy();
	second = loadSeparateCopy();
});

after(() => {
	mock.restoreAll();
	mock.timers.reset();
});

describe('rate-limit store shared by every copy of the module', () => {
	it('loads two separate copies of the module', () => {
		assert.notEqual(first, second, 'both loads returned the same module instance, so the test proves nothing');
		assert.notEqual(first.ratelimit, second.ratelimit);
	});

	it('a budget spent through one copy is refused by the other', async () => {
		const key = 'shared-store:spent';
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			const result = await first.ratelimit(key, LIMIT, WINDOW_MS);
			assert.equal(result.success, true, `attempt ${attempt} through the first copy was refused`);
		}

		const other = await second.ratelimit(key, LIMIT, WINDOW_MS);
		assert.equal(other.success, false, 'the second copy allowed a sixth attempt the first copy had counted');
		assert.equal(other.remaining, 0);
		assert.equal(second.getRateLimitStatus(key, LIMIT).remaining, 0);
	});

	it('counts attempts made through both copies against one budget', async () => {
		const key = 'shared-store:mixed';
		await first.ratelimit(key, LIMIT, WINDOW_MS);
		await second.ratelimit(key, LIMIT, WINDOW_MS);
		await first.ratelimit(key, LIMIT, WINDOW_MS);
		assert.equal(first.getRateLimitStatus(key, LIMIT).remaining, LIMIT - 3);
		assert.equal(second.getRateLimitStatus(key, LIMIT).remaining, LIMIT - 3);
	});

	it('a refund through either copy shows in both', async () => {
		const key = 'shared-store:refund';
		const reservedByFirst = await first.ratelimit(key, LIMIT, WINDOW_MS);
		const reservedBySecond = await second.ratelimit(key, LIMIT, WINDOW_MS);
		assert.equal(first.getRateLimitStatus(key, LIMIT).remaining, LIMIT - 2);

		second.refundRateLimit(key, reservedByFirst.resetTime);
		assert.equal(first.getRateLimitStatus(key, LIMIT).remaining, LIMIT - 1, 'a refund through the second copy');
		assert.equal(second.getRateLimitStatus(key, LIMIT).remaining, LIMIT - 1);

		first.refundRateLimit(key, reservedBySecond.resetTime);
		assert.equal(first.getRateLimitStatus(key, LIMIT).remaining, LIMIT, 'a refund through the first copy');
		assert.equal(second.getRateLimitStatus(key, LIMIT).remaining, LIMIT);
	});

	it('a reset through one copy clears the key for the other', async () => {
		const key = 'shared-store:reset';
		for (let attempt = 1; attempt <= LIMIT; attempt++) {
			await second.ratelimit(key, LIMIT, WINDOW_MS);
		}
		first.resetRateLimit(key);
		assert.equal(second.getRateLimitStatus(key, LIMIT).remaining, LIMIT);
		assert.equal((await second.ratelimit(key, LIMIT, WINDOW_MS)).success, true);
	});

	it('starts the cleanup interval once per process, not once per copy', () => {
		assert.equal(intervalsStarted, 1, `${intervalsStarted} cleanup intervals for two copies of the module`);
	});
});
