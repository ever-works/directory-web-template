import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	listingPageCount,
	pagingCanonicalPath,
	pagingTitle,
	parsePageParam,
	resolveAliasPage,
	resolveListingPage
} from '../paging';

/**
 * Page-number helpers for /tags/paging/<n> and /collections/paging/<n>
 * (lib/seo/paging.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * Measured on a directory built from this template: /tags/paging/abc,
 * /tags/paging/999 and /collections/paging/2 (a site with no collections) all
 * answered 200, index,follow, with a self canonical over an empty grid, and
 * /tags/paging/1 pointed at itself while duplicating /tags.
 */

describe('parsePageParam', () => {
	it('reads a plain positive integer', () => {
		assert.equal(parsePageParam('1'), 1);
		assert.equal(parsePageParam('2'), 2);
		assert.equal(parsePageParam('10'), 10);
		assert.equal(parsePageParam('19'), 19);
	});

	it('rejects what parseInt() let through', () => {
		for (const raw of ['abc', '2abc', '1.5', ' 2', '2 ', '+2', '-1', '0', '02', '1e3', '0x10', '']) {
			assert.equal(parsePageParam(raw), null, JSON.stringify(raw));
		}
	});

	it('rejects a missing segment and an unsafe integer', () => {
		assert.equal(parsePageParam(undefined), null);
		assert.equal(parsePageParam(null), null);
		assert.equal(parsePageParam('9007199254740993'), null);
	});
});

describe('listingPageCount', () => {
	it('rounds up to whole pages', () => {
		assert.equal(listingPageCount(12, 12), 1);
		assert.equal(listingPageCount(13, 12), 2);
		assert.equal(listingPageCount(252, 12), 21);
		assert.equal(listingPageCount(7, 6), 2);
	});

	it('gives an empty listing its first page', () => {
		assert.equal(listingPageCount(0, 12), 1);
		assert.equal(listingPageCount(0, 6), 1);
	});

	it('copes with nonsense sizes', () => {
		assert.equal(listingPageCount(Number.NaN, 12), 1);
		assert.equal(listingPageCount(10, 0), 1);
	});
});

describe('resolveListingPage', () => {
	it('accepts every page of the listing', () => {
		assert.equal(resolveListingPage('1', 30, 12), 1);
		assert.equal(resolveListingPage('2', 30, 12), 2);
		assert.equal(resolveListingPage('3', 30, 12), 3);
	});

	it('rejects a page past the last one', () => {
		assert.equal(resolveListingPage('4', 30, 12), null);
		assert.equal(resolveListingPage('999', 30, 12), null);
	});

	it('keeps page 1 of an empty listing and nothing after it', () => {
		assert.equal(resolveListingPage('1', 0, 6), 1);
		assert.equal(resolveListingPage('2', 0, 6), null);
	});

	it('rejects a malformed page', () => {
		assert.equal(resolveListingPage('abc', 30, 12), null);
		assert.equal(resolveListingPage('02', 30, 12), null);
	});
});

describe('pagingCanonicalPath / pagingTitle', () => {
	it('sends page 1 to the listing index', () => {
		assert.equal(pagingCanonicalPath('/tags', 1), '/tags');
		assert.equal(pagingCanonicalPath('/collections', 1), '/collections');
		assert.equal(pagingTitle('Tags', 1), 'Tags');
	});

	it('gives later pages their own path and title', () => {
		assert.equal(pagingCanonicalPath('/tags', 2), '/tags/paging/2');
		assert.equal(pagingCanonicalPath('/collections', 10), '/collections/paging/10');
		assert.equal(pagingTitle('Tags', 2), 'Tags - Page 2');
	});
});

describe('resolveAliasPage', () => {
	// A record with 30 entries at 12 per page has pages 1-3.
	it('reads no page segment as page 1', () => {
		assert.equal(resolveAliasPage([], 30, 12), 1);
		assert.equal(resolveAliasPage([], 0, 12), 1);
	});

	it('accepts a page of the record', () => {
		assert.equal(resolveAliasPage(['1'], 30, 12), 1);
		assert.equal(resolveAliasPage(['2'], 30, 12), 2);
		assert.equal(resolveAliasPage(['3'], 30, 12), 3);
	});

	it('rejects a malformed page segment instead of reading it as page 1', () => {
		for (const raw of ['abc', '0', '02', '2abc', '']) {
			assert.equal(resolveAliasPage([raw], 30, 12), null, JSON.stringify(raw));
		}
	});

	it('rejects a page past the last one', () => {
		assert.equal(resolveAliasPage(['4'], 30, 12), null);
		assert.equal(resolveAliasPage(['999'], 30, 12), null);
		assert.equal(resolveAliasPage(['2'], 0, 12), null);
	});

	it('rejects any segment after the page', () => {
		assert.equal(resolveAliasPage(['2', 'extra'], 30, 12), null);
		assert.equal(resolveAliasPage(['2', 'x', 'y'], 30, 12), null);
		assert.equal(resolveAliasPage(['extra', 'junk'], 30, 12), null);
	});
});
