import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { MAX_PAGE, parsePaginationParams } from '../pagination-params';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * GET /api/admin/clients/advanced-search read `limit` with `Number(searchParams.get('limit'))`.
 * `Number(null)` is 0, so a request without `limit` (or with `?limit=`) got 1 client per page
 * instead of the documented 10; the dashboard route did the same for `?limit=`. Both read `page`
 * with a bare `Number()` and no upper bound, so `?page=1000000000000000000` pushed the SQL OFFSET
 * past the bigint range and answered 500, and loose values were read as numbers (`?limit=0x10`
 * was 16). The routes import the DB layer, which cannot load under `tsx --test`, so the wiring
 * guard reads the sources and the rules are checked on the helper they call.
 */
const readRoute = (path: string) =>
	readFileSync(join(__dirname, '../../../app/api/admin/clients', path), 'utf8').replace(/\s+/g, ' ');

const routes = {
	'advanced-search': readRoute('advanced-search/route.ts'),
	dashboard: readRoute('dashboard/route.ts')
};

const HELPER_CALL =
	/parsePaginationParams\( ?searchParams\.get\('page'\), searchParams\.get\('limit'\), \{ ?defaultLimit: 10, maxLimit: 100 ?\} ?\)/;

describe('admin clients pagination wiring', () => {
	for (const [name, source] of Object.entries(routes)) {
		it(`${name} parses page and limit with parsePaginationParams (default 10, max 100)`, () => {
			assert.ok(source.includes("from '@/lib/utils/pagination-params'"), `${name}: helper is not imported`);
			assert.match(source, HELPER_CALL, `${name}: page / limit are not parsed with the shared helper`);
			assert.ok(!source.includes('Number(searchParams'), `${name}: page / limit are still read with Number()`);
		});
	}
});

describe('admin clients pagination rules', () => {
	const parse = (page: string | null, limit: string | null) =>
		parsePaginationParams(page, limit, { defaultLimit: 10, maxLimit: 100 });

	it('uses 10 rows when the limit is missing or empty', () => {
		assert.equal(parse(null, null).limit, 10);
		assert.equal(parse('1', '').limit, 10);
	});

	it('does not read loose numbers such as 0x10 or 1e2 as a limit', () => {
		assert.equal(parse(null, '0x10').limit, 10);
		assert.equal(parse(null, '1e2').limit, 10);
		assert.equal(parse(null, '1.5').limit, 10);
	});

	it('clamps the limit to 1..100 and keeps a valid one', () => {
		assert.equal(parse(null, '0').limit, 1);
		assert.equal(parse(null, '-5').limit, 1);
		assert.equal(parse(null, '20').limit, 20);
		assert.equal(parse(null, '5000').limit, 100);
	});

	it('caps a huge page at MAX_PAGE so the offset stays a small exact integer', () => {
		const capped = parse('1000000000', '100');
		assert.equal(capped.page, MAX_PAGE);
		assert.equal(capped.offset, (MAX_PAGE - 1) * 100);
		assert.ok(Number.isSafeInteger(capped.offset));

		// Beyond the safe-integer range the value is not exact, so it is page 1 (spec 056 R0).
		assert.deepEqual(parse('1000000000000000000', '10'), { page: 1, limit: 10, offset: 0 });
	});

	it('falls back to page 1 for a missing, empty or non-numeric page', () => {
		assert.equal(parse(null, null).page, 1);
		assert.equal(parse('', null).page, 1);
		assert.equal(parse('abc', null).page, 1);
		assert.equal(parse('0', null).page, 1);
		assert.equal(parse('3', null).page, 3);
	});
});
