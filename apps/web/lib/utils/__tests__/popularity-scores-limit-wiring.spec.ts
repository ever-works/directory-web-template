import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { parsePaginationParams } from '../pagination-params';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/items/popularity-scores?limit=abc used to slice with NaN (empty list, `showing: null`)
 * and `?limit=-3` sliced off the last three items instead of returning a short list. The route
 * imports the content and DB layers, which cannot load under `tsx --test`, so the wiring guard
 * reads the source and the limit rules are checked on the helper it calls.
 */
const route = readFileSync(join(__dirname, '../../../app/api/items/popularity-scores/route.ts'), 'utf8').replace(
	/\s+/g,
	' '
);

describe('popularity-scores limit', () => {
	it('parses the limit with parsePaginationParams and no longer uses parseInt', () => {
		assert.ok(route.includes("from '@/lib/utils/pagination-params'"), 'helper is not imported');
		assert.ok(
			route.includes(
				"parsePaginationParams(null, searchParams.get('limit'), { defaultLimit: 20, maxLimit: 100 })"
			),
			'limit is not parsed with the shared helper'
		);
		assert.ok(!route.includes("parseInt(searchParams.get('limit')"), 'limit is still read with parseInt');
	});

	const limitOf = (raw: string | null) => parsePaginationParams(null, raw, { defaultLimit: 20, maxLimit: 100 }).limit;

	it('falls back to 20 when the limit is missing or not a number', () => {
		assert.equal(limitOf(null), 20);
		assert.equal(limitOf('abc'), 20);
		assert.equal(limitOf(''), 20);
	});

	it('clamps to 1..100', () => {
		assert.equal(limitOf('-3'), 1);
		assert.equal(limitOf('0'), 1);
		assert.equal(limitOf('5000'), 100);
	});

	it('keeps a valid limit unchanged', () => {
		assert.equal(limitOf('1'), 1);
		assert.equal(limitOf('35'), 35);
		assert.equal(limitOf('100'), 100);
	});
});
