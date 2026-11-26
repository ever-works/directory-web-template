import assert from 'node:assert/strict';
import { after, before, describe, it, mock } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * signInAction reserves a slot of the per-email password budget with `ratelimit()` and gives it
 * back with `refundRateLimit()` once the password proves correct (T-2831). The check in between
 * takes time, so a correct sign-in can reserve near the end of a window and refund after a later
 * submission has opened the next one. The refund must then be dropped: taking it off the new
 * window would erase that submission's failed attempt and buy an extra password guess.
 *
 * The module starts a cleanup `setInterval` when it loads, so it is imported only after the timers
 * (and `Date`) are mocked; the fake interval keeps the test process from hanging.
 */
type RateLimitModule = typeof import('../rate-limit');

const WINDOW_MS = 15 * 60 * 1000;
let rl: RateLimitModule;

before(async () => {
	mock.timers.enable({ apis: ['setInterval', 'Date'], now: 1_000_000 });
	rl = await import('../rate-limit');
});

after(() => {
	mock.timers.reset();
});

describe('refundRateLimit', () => {
	it('gives back one slot inside the window that reserved it', async () => {
		const key = 'refund-test:same-window';
		await rl.ratelimit(key, 2, WINDOW_MS);
		const last = await rl.ratelimit(key, 2, WINDOW_MS);
		assert.equal((await rl.ratelimit(key, 2, WINDOW_MS)).success, false, 'the budget of 2 is not spent');

		rl.refundRateLimit(key, last.resetTime);
		assert.equal((await rl.ratelimit(key, 2, WINDOW_MS)).success, true, 'the refund did not free a slot');
		assert.equal((await rl.ratelimit(key, 2, WINDOW_MS)).success, false, 'the refund freed more than one slot');
	});

	it('drops a refund whose window was replaced, so the new window keeps its attempt', async () => {
		const key = 'refund-test:replaced-window';
		// A correct sign-in reserves near the end of a window ...
		const reserved = await rl.ratelimit(key, 1, WINDOW_MS);
		assert.equal(reserved.success, true);

		// ... the window runs out while its password is checked, and a wrong guess opens the next one.
		mock.timers.tick(WINDOW_MS + 1);
		const guess = await rl.ratelimit(key, 1, WINDOW_MS);
		assert.equal(guess.success, true);
		assert.ok(guess.resetTime > reserved.resetTime);

		// The late refund belongs to the old window and must not erase the wrong guess.
		rl.refundRateLimit(key, reserved.resetTime);
		assert.equal(
			(await rl.ratelimit(key, 1, WINDOW_MS)).success,
			false,
			'a refund from an expired window freed a slot in the new one'
		);
	});

	it('is a no-op once the reserving window has expired', async () => {
		const key = 'refund-test:expired';
		const reserved = await rl.ratelimit(key, 1, WINDOW_MS);
		mock.timers.tick(WINDOW_MS + 1);
		rl.refundRateLimit(key, reserved.resetTime);
		assert.equal(rl.getRateLimitStatus(key, 1).remaining, 1);
	});
});
