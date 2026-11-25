import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_INT32, parseNonNegativeIntParam } from '../non-negative-int-param';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/admin/clients/advanced-search read `minSubmissions` / `maxSubmissions` with
 * `Number(v)` and `Math.floor`. `Number('')` is 0, so `?maxSubmissions=` filtered to clients with
 * 0 submissions; `0x10`, `1e2` and `2.9` were read as 16, 100 and 2; a negative value was kept; and
 * `3000000000` is past the 32-bit `total_submissions` column, so Postgres threw and the route
 * answered 500. The helper only accepts a whole number from 0 to 2147483647.
 */
describe('parseNonNegativeIntParam', () => {
	it('treats a missing, empty or whitespace value as no value', () => {
		assert.deepEqual(parseNonNegativeIntParam(null), { ok: true, value: undefined });
		assert.deepEqual(parseNonNegativeIntParam(undefined), { ok: true, value: undefined });
		assert.deepEqual(parseNonNegativeIntParam(''), { ok: true, value: undefined });
		assert.deepEqual(parseNonNegativeIntParam('  '), { ok: true, value: undefined });
	});

	it('reads a whole number, trimmed', () => {
		assert.deepEqual(parseNonNegativeIntParam('0'), { ok: true, value: 0 });
		assert.deepEqual(parseNonNegativeIntParam('16'), { ok: true, value: 16 });
		assert.deepEqual(parseNonNegativeIntParam(' 5 '), { ok: true, value: 5 });
	});

	it('accepts the largest value the integer column holds and nothing above it', () => {
		assert.equal(MAX_INT32, 2147483647);
		assert.deepEqual(parseNonNegativeIntParam('2147483647'), { ok: true, value: MAX_INT32 });
		assert.deepEqual(parseNonNegativeIntParam('2147483648'), { ok: false });
		assert.deepEqual(parseNonNegativeIntParam('3000000000'), { ok: false });
		assert.deepEqual(parseNonNegativeIntParam('9'.repeat(400)), { ok: false });
	});

	it('rejects values that are not a plain whole number', () => {
		for (const raw of ['0x10', '1e2', '1e20', '2.9', '-1', '+5', 'abc', '5abc', 'Infinity', 'NaN']) {
			assert.deepEqual(parseNonNegativeIntParam(raw), { ok: false }, `"${raw}" should be invalid`);
		}
	});
});
