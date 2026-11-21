import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterSummaries, scoreItem, searchSummaries, sortSummaries, taxonomySlug, tokenize } from '../search';
import type { ItemSummary } from '../types';
import { fixtureCatalog } from './fixtures';

/**
 * Shared search ranking of Agent Access Contract v1 (lib/agent-access/search.ts),
 * identical to the minimal template's `packages/agent-api/src/search.ts`.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

function item(partial: Partial<ItemSummary> & { slug: string; name: string }): ItemSummary {
	return {
		description: '',
		url: `https://x.test/items/${partial.slug}`,
		website: null,
		categories: [],
		category_ids: [],
		tags: [],
		tag_ids: [],
		featured: false,
		logo: null,
		updated_at: null,
		...partial
	};
}

const text = (entry: ItemSummary) => ({
	name: entry.name,
	description: entry.description,
	taxonomy: [...entry.categories, ...entry.tags],
	featured: entry.featured
});

describe('tokenize', () => {
	it('normalises (lowercase, no accents), splits on non-alphanumerics and dedupes', () => {
		assert.deepEqual(tokenize('  Open-Source, TIME tracker!! time '), ['open', 'source', 'time', 'tracker']);
		assert.deepEqual(tokenize('Café 東京'), ['cafe', '東京']);
		assert.deepEqual(tokenize('--- !!'), []);
	});
});

describe('scoreItem', () => {
	const base = item({ slug: 'a', name: 'Track', description: 'tracks time', categories: ['Time Tracking'] });

	it('scores +8 exact name, +5 word prefix, +3 contains, +2 taxonomy, +1 description', () => {
		assert.equal(scoreItem(['track'], text(base)), 8 + 2 + 1, 'exact name, also in category and description');
		assert.equal(scoreItem(['track'], text(item({ slug: 'b', name: 'Tracker' }))), 5);
		assert.equal(scoreItem(['track'], text(item({ slug: 'b2', name: 'Time Tracker' }))), 5, 'a later word counts');
		assert.equal(scoreItem(['track'], text(item({ slug: 'c', name: 'Easytrack' }))), 3);
		assert.equal(scoreItem(['track'], text(item({ slug: 'd', name: 'Other', tags: ['Tracking'] }))), 2);
		assert.equal(scoreItem(['track'], text(item({ slug: 'e', name: 'Other', description: 'we track' }))), 1);
	});

	it('requires every token to match somewhere', () => {
		assert.equal(scoreItem(['track', 'invoice'], text(base)), 0);
		assert.equal(scoreItem([], text(base)), 0);
	});

	it('adds +10 when the whole query is the name, +0.5 for featured', () => {
		assert.equal(scoreItem(['track'], text(base), 'track'), 21);
		assert.equal(scoreItem(['track'], { ...text(base), featured: true }), 11.5);
	});
});

describe('searchSummaries', () => {
	const items = fixtureCatalog().items;

	it('ranks by score, then name', () => {
		// kimai, invoice-ninja: (2 category + 1 description) x 2 tokens = 6, tied, so by name;
		// toggl: its description says "tracker", not "tracking": 3 + 2 + 0.5 featured = 5.5;
		// timer: "time" is a prefix of its name, "tracking" matches nothing, so it is not a result.
		assert.deepEqual(
			searchSummaries(items, 'time tracking').map((entry) => entry.slug),
			['invoice-ninja', 'kimai', 'toggl']
		);
	});

	it('ties sort by name; a query without tokens returns every item', () => {
		const tied = [item({ slug: 'z', name: 'Zeta tool' }), item({ slug: 'a', name: 'Alpha tool' })];
		assert.deepEqual(
			searchSummaries(tied, 'tool').map((entry) => entry.slug),
			['a', 'z']
		);
		assert.equal(searchSummaries(items, '!!').length, items.length);
	});
});

describe('filterSummaries', () => {
	const items = fixtureCatalog().items;

	it('matches a category by id, display name or slug, case- and accent-insensitively', () => {
		for (const category of ['time-tracking', 'Time Tracking', 'TIME-TRACKING', 'time tracking']) {
			assert.deepEqual(
				filterSummaries(items, { category }).map((entry) => entry.slug),
				['toggl', 'kimai', 'invoice-ninja'],
				category
			);
		}
		assert.deepEqual(filterSummaries(items, { category: 'unknown stuff' }).map((entry) => entry.slug), ['timer']);
	});

	it('filters by tag; featured: true keeps featured items, false does not filter', () => {
		assert.deepEqual(filterSummaries(items, { tag: 'free' }).map((entry) => entry.slug), ['toggl', 'kimai']);
		assert.deepEqual(filterSummaries(items, { featured: true }).map((entry) => entry.slug), ['toggl']);
		assert.equal(filterSummaries(items, { featured: false }).length, items.length);
		assert.equal(filterSummaries(items, { tag: 'nope' }).length, 0);
	});
});

describe('sortSummaries', () => {
	const items = fixtureCatalog().items;

	it('featured first then name (default), name, date', () => {
		assert.deepEqual(
			sortSummaries(items, 'featured').map((entry) => entry.slug),
			['toggl', 'invoice-ninja', 'kimai', 'timer']
		);
		assert.deepEqual(
			sortSummaries(items, 'name-desc').map((entry) => entry.slug),
			['toggl', 'timer', 'kimai', 'invoice-ninja']
		);
		assert.deepEqual(
			sortSummaries(items, 'date-desc').map((entry) => entry.slug),
			['kimai', 'toggl', 'invoice-ninja', 'timer']
		);
	});
});

describe('taxonomySlug', () => {
	it('collapses everything but [a-z0-9] to dashes after stripping accents', () => {
		assert.equal(taxonomySlug(' Café  Tools '), 'cafe-tools');
		assert.equal(taxonomySlug('Open-Source'), 'open-source');
	});
});
