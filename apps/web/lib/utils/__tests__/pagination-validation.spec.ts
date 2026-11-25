import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validatePaginationParams, validateStrictPaginationParams } from '../pagination-validation';

/**
 * Pagination parsing shared by admin list routes (lib/utils/pagination-validation.ts).
 *
 * `GET /api/admin/comments?page=abc` used to compute `Number('abc')` = NaN and
 * send a NaN OFFSET to Postgres (500); `limit=100000` read the whole table.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

const qs = (query: string) => new URLSearchParams(query);

describe('validateStrictPaginationParams', () => {
	it('defaults to page 1, limit 10 when nothing is sent', () => {
		assert.deepEqual(validateStrictPaginationParams(qs('')), { page: 1, limit: 10 });
	});

	it('treats empty values as absent', () => {
		assert.deepEqual(validateStrictPaginationParams(qs('page=&limit=')), { page: 1, limit: 10 });
	});

	it('accepts whole numbers in range, including the limit bounds', () => {
		assert.deepEqual(validateStrictPaginationParams(qs('page=3&limit=12')), { page: 3, limit: 12 });
		assert.deepEqual(validateStrictPaginationParams(qs('limit=1')), { page: 1, limit: 1 });
		assert.deepEqual(validateStrictPaginationParams(qs('limit=100')), { page: 1, limit: 100 });
	});

	it('rejects a non-numeric page or limit', () => {
		for (const query of ['page=abc', 'limit=abc', 'page=2abc', 'limit=1.5', 'page=1e2']) {
			const result = validateStrictPaginationParams(qs(query));
			assert.ok('error' in result, query);
			assert.equal((result as { status: number }).status, 400, query);
		}
	});

	it('names the offending parameter', () => {
		const result = validateStrictPaginationParams(qs('page=1&limit=1.5'));
		assert.ok('error' in result);
		assert.match(result.error, /limit/);
	});

	it('rejects page below 1 and limit outside 1-100', () => {
		for (const query of ['page=0', 'page=-3', 'limit=0', 'limit=-1', 'limit=101', 'limit=100000']) {
			const result = validateStrictPaginationParams(qs(query));
			assert.ok('error' in result, query);
		}
	});

	it('rejects a page too large to be a safe OFFSET (Infinity, precision loss)', () => {
		for (const page of ['9'.repeat(400), '9'.repeat(20), '9007199254740991']) {
			const result = validateStrictPaginationParams(qs(`page=${page}&limit=100`));
			assert.ok('error' in result, page.slice(0, 20));
			assert.equal((result as { status: number }).status, 400);
		}
	});

	it('accepts a large but safe page', () => {
		assert.deepEqual(validateStrictPaginationParams(qs('page=100000&limit=100')), { page: 100000, limit: 100 });
	});

	it('keeps the lenient validator unchanged for existing routes', () => {
		assert.deepEqual(validatePaginationParams(qs('limit=1.5')), { page: 1, limit: 1 });
	});
});

/**
 * `GET /api/admin/clients?page=1000000000000000000` (and the other admin lists that use
 * the lenient validator) turned the page into an OFFSET of about 1e19, past the Postgres
 * bigint range, so the query threw and the route answered 500 instead of 400.
 */
describe('validatePaginationParams', () => {
	const pageError = { error: 'Invalid page parameter. Must be a positive integer.', status: 400 };

	for (const [name, page] of [
		['page=1000000000000000000 (OFFSET past bigint)', '1000000000000000000'],
		['a 400-digit page (parseInt gives Infinity)', '9'.repeat(400)],
		['page=9007199254740991 (page * limit not a safe integer)', '9007199254740991']
	]) {
		it(`rejects ${name} with limit=100`, () => {
			assert.deepEqual(validatePaginationParams(qs(`page=${page}&limit=100`)), pageError);
		});
	}

	it('rejects a huge page with the default limit too', () => {
		assert.deepEqual(validatePaginationParams(qs('page=1000000000000000000')), pageError);
	});

	it('accepts a large but safe page', () => {
		assert.deepEqual(validatePaginationParams(qs('page=100000&limit=100')), { page: 100000, limit: 100 });
	});

	it('keeps the lenient parsing and the range rules', () => {
		assert.deepEqual(validatePaginationParams(qs('')), { page: 1, limit: 10 });
		assert.deepEqual(validatePaginationParams(qs('page=2abc&limit=12')), { page: 2, limit: 12 });
		assert.deepEqual(validatePaginationParams(qs('page=0')), pageError);
		assert.deepEqual(validatePaginationParams(qs('page=abc')), pageError);
		assert.deepEqual(validatePaginationParams(qs('limit=101')), {
			error: 'Invalid limit parameter. Must be between 1 and 100.',
			status: 400
		});
	});

	it('reports an out-of-range limit before a huge page', () => {
		const result = validatePaginationParams(qs('page=1000000000000000000&limit=500'));
		assert.ok('error' in result);
		assert.match(result.error, /limit/);
	});
});
