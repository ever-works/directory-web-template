import assert from 'node:assert/strict';
import { after, describe, it, mock } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `lib/utils/rate-limit.ts` starts a cleanup `setInterval` when it loads. The interval was not
 * unref'd, so a process that loaded the module could not exit: a script, or a `tsx --test` spec
 * that reaches it directly or through lib/auth (the tenant lookup's session step imports it), sat
 * on the interval after its last test passed, and `test:unit` hung (T-2854). The interval is
 * unref'd now: a server still runs it, and a script or spec exits when its work is done.
 *
 * The real `setInterval` is wrapped, not mocked, so the timer checked is the one the module starts.
 * `after` clears it, so this file exits even while the interval still holds the process.
 */
const realSetInterval = globalThis.setInterval;
const started: NodeJS.Timeout[] = [];

mock.method(globalThis, 'setInterval', ((...args: Parameters<typeof setInterval>) => {
	const timer = realSetInterval(...args) as unknown as NodeJS.Timeout;
	started.push(timer);
	return timer;
}) as typeof setInterval);
require('../rate-limit');
mock.restoreAll();

after(() => {
	for (const timer of started) clearInterval(timer);
});

describe('rate-limit cleanup interval (T-2854)', () => {
	it('starts one cleanup interval when the module loads', () => {
		assert.equal(started.length, 1);
	});

	it('does not keep the process alive', () => {
		assert.equal(started[0].hasRef(), false, 'the cleanup interval holds the process open');
	});
});
