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

	it('caps an absurdly large page so the offset stays a small exact integer', () => {
		const huge = parsePaginationParams('99999999999999999999', '10');
		assert.equal(huge.page, MAX_PAGE);
		assert.equal(huge.offset, (MAX_PAGE - 1) * 10);
		assert.ok(Number.isSafeInteger(huge.offset));
		assert.equal(parsePaginationParams('1e400', null).page, 1);
		assert.equal(parsePaginationParams(String(MAX_PAGE), '10').page, MAX_PAGE);
		assert.equal(parsePaginationParams(String(MAX_PAGE + 1), '10').page, MAX_PAGE);
	});

	it('never lets the fallback limit exceed the max limit', () => {
		assert.deepEqual(parsePaginationParams(null, 'abc', { defaultLimit: 200, maxLimit: 50 }), {
			page: 1,
			limit: 50,
			offset: 0
		});
	});

	it('honours custom default and max limits', () => {
		assert.deepEqual(parsePaginationParams('2', 'abc', { defaultLimit: 25, maxLimit: 100 }), {
			page: 2,
			limit: 25,
			offset: 25
		});
	});
});
