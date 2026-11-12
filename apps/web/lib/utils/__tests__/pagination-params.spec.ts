import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_PAGE, parsePaginationParams } from '../pagination-params';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/auth/security/login-activity?page=abc used to compute an OFFSET of
 * NaN and answer 500.
 */
describe('parsePaginationParams', () => {
	it('uses defaults when the params are missing', () => {
		assert.deepEqual(parsePaginationParams(null, null), { page: 1, limit: 10, offset: 0 });
		assert.deepEqual(parsePaginationParams(undefined, undefined), { page: 1, limit: 10, offset: 0 });
	});

	it('reads valid numbers and computes the offset', () => {
		assert.deepEqual(parsePaginationParams('3', '20'), { page: 3, limit: 20, offset: 40 });
	});

	it('falls back to defaults for non-numeric values instead of NaN', () => {
		assert.deepEqual(parsePaginationParams('abc', 'xyz'), { page: 1, limit: 10, offset: 0 });
		assert.deepEqual(parsePaginationParams('', ''), { page: 1, limit: 10, offset: 0 });
	});

	it('clamps zero, negative and oversized values', () => {
		assert.deepEqual(parsePaginationParams('0', '0'), { page: 1, limit: 1, offset: 0 });
		assert.deepEqual(parsePaginationParams('-4', '-2'), { page: 1, limit: 1, offset: 0 });
		assert.deepEqual(parsePaginationParams('2', '9999'), { page: 2, limit: 50, offset: 50 });
	});

	it('caps a large page so the offset stays a small exact integer', () => {
		assert.equal(parsePaginationParams(String(MAX_PAGE), '10').page, MAX_PAGE);
		const over = parsePaginationParams(String(MAX_PAGE + 1), '10');
		assert.equal(over.page, MAX_PAGE);
		assert.equal(over.offset, (MAX_PAGE - 1) * 10);
		assert.ok(Number.isSafeInteger(over.offset));
	});

	it('falls back to the defaults for integers that are not exactly representable', () => {
		assert.deepEqual(parsePaginationParams('99999999999999999999', '9007199254740993'), {
			page: 1,
			limit: 10,
			offset: 0
		});
		assert.equal(parsePaginationParams('1e400', null).page, 1);
	});

	it('does not read a different page or size from a malformed number', () => {
		for (const bad of ['2abc', '1.5', '3e2', '0x10', '+4', '--2', '5 6']) {
			assert.deepEqual(parsePaginationParams(bad, bad), { page: 1, limit: 10, offset: 0 }, bad);
		}
		assert.deepEqual(parsePaginationParams(' 3 ', ' 20 '), { page: 3, limit: 20, offset: 40 });
	});

	it('never lets the fallback limit exceed the max limit', () => {
		assert.deepEqual(parsePaginationParams(null, 'abc', { defaultLimit: 200, maxLimit: 50 }), {
			page: 1,
			limit: 50,
			offset: 0
		});
	});

	it('clamps the fallback limit when maxLimit is below the default limit', () => {
		assert.deepEqual(parsePaginationParams(null, null, { maxLimit: 5 }), { page: 1, limit: 5, offset: 0 });
		assert.deepEqual(parsePaginationParams('2', '2abc', { maxLimit: 5 }), { page: 2, limit: 5, offset: 5 });
	});

	it('honours custom default and max limits', () => {
		assert.deepEqual(parsePaginationParams('2', 'abc', { defaultLimit: 25, maxLimit: 100 }), {
			page: 2,
			limit: 25,
			offset: 25
		});
	});
});
