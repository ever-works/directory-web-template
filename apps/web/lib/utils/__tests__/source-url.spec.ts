import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findItemBySourceUrl, normalizeSourceUrl } from '../source-url';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * POST /api/client/items used to accept the same link again and again, so the
 * review queue filled with copies of an entry already in the directory.
 */
describe('normalizeSourceUrl', () => {
	it('treats scheme, host case, www, trailing slash and fragment as noise', () => {
		const key = normalizeSourceUrl('https://example.com/tool');
		assert.equal(normalizeSourceUrl('http://example.com/tool'), key);
		assert.equal(normalizeSourceUrl('https://EXAMPLE.com/tool'), key);
		assert.equal(normalizeSourceUrl('https://www.example.com/tool'), key);
		assert.equal(normalizeSourceUrl('https://example.com/tool/'), key);
		assert.equal(normalizeSourceUrl('https://example.com/tool#pricing'), key);
		assert.equal(normalizeSourceUrl('  https://example.com/tool  '), key);
	});

	it('keeps the order of repeated values of one parameter', () => {
		assert.notEqual(
			normalizeSourceUrl('https://example.com/tool?id=1&id=2'),
			normalizeSourceUrl('https://example.com/tool?id=2&id=1')
		);
		assert.equal(
			normalizeSourceUrl('https://example.com/tool?b=2&id=1&id=2'),
			normalizeSourceUrl('https://example.com/tool?id=1&b=2&id=2')
		);
	});

	it('drops tracking parameters and ignores the order of the others', () => {
		assert.equal(
			normalizeSourceUrl('https://example.com/?utm_source=x&fbclid=1&b=2&a=1'),
			normalizeSourceUrl('https://example.com?a=1&b=2')
		);
	});

	it('keeps links apart when the page really differs', () => {
		const base = normalizeSourceUrl('https://example.com/tool');
		assert.notEqual(normalizeSourceUrl('https://example.com/other'), base);
		assert.notEqual(normalizeSourceUrl('https://example.com/Tool'), base);
		assert.notEqual(normalizeSourceUrl('https://example.com/tool?id=2'), base);
		assert.notEqual(normalizeSourceUrl('https://example.com:8080/tool'), base);
		assert.notEqual(normalizeSourceUrl('https://docs.example.com/tool'), base);
		assert.notEqual(normalizeSourceUrl('https://example.org/tool'), base);
		assert.notEqual(
			normalizeSourceUrl('https://example.com/tool?id=1'),
			normalizeSourceUrl('https://example.com/tool?id=2')
		);
	});

	it('does not merge the site root with a deeper page', () => {
		assert.notEqual(normalizeSourceUrl('https://example.com/'), normalizeSourceUrl('https://example.com/tool'));
		assert.equal(normalizeSourceUrl('https://example.com/'), normalizeSourceUrl('https://example.com'));
	});

	it('returns null for anything that is not an http(s) URL', () => {
		assert.equal(normalizeSourceUrl(''), null);
		assert.equal(normalizeSourceUrl('   '), null);
		assert.equal(normalizeSourceUrl('not a url'), null);
		assert.equal(normalizeSourceUrl('javascript:alert(1)'), null);
		assert.equal(normalizeSourceUrl('ftp://example.com/file'), null);
		assert.equal(normalizeSourceUrl(undefined), null);
		assert.equal(normalizeSourceUrl(null), null);
		assert.equal(normalizeSourceUrl(42), null);
	});
});

describe('findItemBySourceUrl', () => {
	const items = [
		{ slug: 'approved-tool', source_url: 'https://example.com/tool', status: 'approved' },
		{ slug: 'waiting-tool', source_url: 'https://waiting.dev/', status: 'pending' },
		{ slug: 'rejected-tool', source_url: 'https://rejected.dev/', status: 'rejected' },
		{ slug: 'draft-tool', source_url: 'https://draft.dev/', status: 'draft' },
		{ slug: 'no-link', source_url: undefined, status: 'approved' }
	];

	it('finds an approved item through a differently written link', () => {
		assert.equal(findItemBySourceUrl(items, 'http://www.example.com/tool/?utm_source=news')?.slug, 'approved-tool');
	});

	it('finds a pending item', () => {
		assert.equal(findItemBySourceUrl(items, 'https://waiting.dev')?.slug, 'waiting-tool');
	});

	it('does not block a link that only a rejected or draft item used', () => {
		assert.equal(findItemBySourceUrl(items, 'https://rejected.dev/'), null);
		assert.equal(findItemBySourceUrl(items, 'https://draft.dev/'), null);
	});

	it('returns null for a new link, a different page on a known site, or an unusable link', () => {
		assert.equal(findItemBySourceUrl(items, 'https://brand-new.dev/'), null);
		assert.equal(findItemBySourceUrl(items, 'https://example.com/another'), null);
		assert.equal(findItemBySourceUrl(items, 'nope'), null);
		assert.equal(findItemBySourceUrl([], 'https://example.com/tool'), null);
	});
});
