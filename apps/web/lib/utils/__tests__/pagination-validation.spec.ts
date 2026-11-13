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
