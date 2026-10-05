import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSitemapPathEnabled, sanitizeSlug, sitemapDate, sitemapSlug, validateSlug } from '../sitemap-urls';

/**
 * Sitemap URL helpers (lib/seo/sitemap-urls.ts), used by app/sitemap.ts.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * A sitemap may only list URLs that answer 200. Measured on a live directory
 * built from this template: every comparison <loc> 404'd, because the sitemap
 * rewrote the stored slug `alpha--beta` to `alpha-beta`, and the comparison
 * route (like every directory route) looks its record up by exact match.
 */

describe('sitemapSlug', () => {
	it('keeps a comparison slug joined with `--` verbatim', () => {
		assert.equal(sitemapSlug('alpha--beta'), 'alpha--beta');
		assert.equal(sitemapSlug('first-tool--second-tool-pro'), 'first-tool--second-tool-pro');
	});

	it('keeps the case of a stored slug (routes match it exactly)', () => {
		assert.equal(sitemapSlug('Open-Source'), 'Open-Source');
	});

	it('keeps a leading or trailing dash or underscore', () => {
		assert.equal(sitemapSlug('-draft'), '-draft');
		assert.equal(sitemapSlug('v2_'), 'v2_');
	});

	it('rejects a slug that is not URL-safe as stored, instead of rewriting it', () => {
		assert.equal(sitemapSlug('two words'), null);
		assert.equal(sitemapSlug('café'), null);
		assert.equal(sitemapSlug('a/b'), null);
		assert.equal(sitemapSlug('x'.repeat(200)), null);
	});

	it('rejects a missing slug', () => {
		assert.equal(sitemapSlug(''), null);
		assert.equal(sitemapSlug(undefined), null);
		assert.equal(sitemapSlug(null), null);
	});

	it('CONTROL: sanitizeSlug is the rewrite that produced the 404s', () => {
		assert.equal(sanitizeSlug('alpha--beta'), 'alpha-beta');
		assert.notEqual(sanitizeSlug('alpha--beta'), sitemapSlug('alpha--beta'));
	});
});

describe('validateSlug', () => {
	it('accepts [A-Za-z0-9_-] under 200 characters', () => {
		assert.equal(validateSlug('time-tracking_2'), true);
		assert.equal(validateSlug('x'.repeat(199)), true);
	});

	it('rejects empty, too long and unsafe values', () => {
		assert.equal(validateSlug(''), false);
		assert.equal(validateSlug(undefined), false);
		assert.equal(validateSlug('x'.repeat(200)), false);
		assert.equal(validateSlug('a b'), false);
	});
});

describe('isSitemapPathEnabled', () => {
	const allOn = { categories: true, tags: true };

	it('lists every path when both sections are on', () => {
		for (const path of ['', '/about', '/categories', '/categories/dev', '/tags', '/tags/open-source']) {
			assert.equal(isSitemapPathEnabled(path, allOn), true, path);
		}
	});

	it('drops /categories and everything under it when categories are off', () => {
		const sections = { categories: false, tags: true };
		assert.equal(isSitemapPathEnabled('/categories', sections), false);
		assert.equal(isSitemapPathEnabled('/categories/dev', sections), false);
		assert.equal(isSitemapPathEnabled('/tags/open-source', sections), true);
	});

	it('drops /tags and everything under it when tags are off', () => {
		const sections = { categories: true, tags: false };
		assert.equal(isSitemapPathEnabled('/tags', sections), false);
		assert.equal(isSitemapPathEnabled('/tags/open-source', sections), false);
		assert.equal(isSitemapPathEnabled('/categories/dev', sections), true);
	});

	it('drops /collections and everything under it when the site has no active collection', () => {
		const sections = { categories: true, tags: true, collections: false };
		assert.equal(isSitemapPathEnabled('/collections', sections), false);
		assert.equal(isSitemapPathEnabled('/collections/paging', sections), false);
		assert.equal(isSitemapPathEnabled('/collections-guide', sections), true);
		assert.equal(isSitemapPathEnabled('/tags', sections), true);
	});

	it('keeps /collections when collections exist or were not checked', () => {
		assert.equal(isSitemapPathEnabled('/collections', { categories: true, tags: true, collections: true }), true);
		assert.equal(isSitemapPathEnabled('/collections', allOn), true);
	});

	it('matches whole path segments only', () => {
		const off = { categories: false, tags: false };
		assert.equal(isSitemapPathEnabled('/tagsmith', off), true);
		assert.equal(isSitemapPathEnabled('/categories-guide', off), true);
		assert.equal(isSitemapPathEnabled('/about', off), true);
	});
});

describe('sitemapDate', () => {
	const fallback = new Date('2026-01-02T03:04:05.000Z');

	it('parses a date string or keeps a Date', () => {
		assert.equal(sitemapDate('2026-09-27T16:55:51.000Z', fallback).toISOString(), '2026-09-27T16:55:51.000Z');
		const d = new Date('2025-05-05T00:00:00.000Z');
		assert.equal(sitemapDate(d, fallback), d);
	});

	it('falls back for a missing or unparseable value (an Invalid Date would fail the sitemap)', () => {
		assert.equal(sitemapDate(undefined, fallback), fallback);
		assert.equal(sitemapDate(null, fallback), fallback);
		assert.equal(sitemapDate('', fallback), fallback);
		assert.equal(sitemapDate('not a date', fallback), fallback);
		assert.equal(sitemapDate(new Date('nope'), fallback), fallback);
	});
});
