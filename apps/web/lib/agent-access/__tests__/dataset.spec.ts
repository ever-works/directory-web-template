import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	absoluteUrl,
	buildCatalog,
	categoriesDocument,
	isoDate,
	itemsDocument,
	publicRepositoryUrl,
	relatedSlugs,
	relationKey,
	tagsDocument
} from '../dataset';
import { fixtureCatalog, fixtureDataset, fixtureInput } from './fixtures';

/**
 * Agent Access Contract v1 data builders (lib/agent-access/dataset.ts).
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

describe('buildCatalog: items', () => {
	const catalog = fixtureCatalog();

	it('keeps one summary per slug and drops records without slug or name', () => {
		assert.deepEqual(
			catalog.items.map((item) => item.slug),
			['toggl', 'kimai', 'invoice-ninja', 'timer']
		);
		assert.equal(catalog.items[0].name, 'Toggl');
	});

	it('builds the exact ItemSummary shape with absolute URLs', () => {
		assert.deepEqual(catalog.items[0], {
			slug: 'toggl',
			name: 'Toggl',
			description: 'Simple time tracker for teams.',
			url: 'https://tools.example.com/items/toggl',
			website: 'https://toggl.com',
			categories: ['Time Tracking'],
			category_ids: ['time-tracking'],
			tags: ['Free', 'Mobile'],
			tag_ids: ['free', 'mobile'],
			featured: true,
			logo: 'https://tools.example.com/logos/toggl.png',
			updated_at: '2026-10-01T10:00:00.000Z'
		});
	});

	it('resolves string references by id or display name, and slugifies unknown ones', () => {
		const kimai = catalog.items.find((item) => item.slug === 'kimai')!;
		assert.deepEqual(kimai.tag_ids, ['open-source', 'free']);
		assert.deepEqual(kimai.tags, ['Open Source', 'Free']);

		const ninja = catalog.items.find((item) => item.slug === 'invoice-ninja')!;
		assert.deepEqual(ninja.category_ids, ['invoicing', 'time-tracking']);
		assert.deepEqual(ninja.categories, ['Invoicing', 'Time Tracking']);
		assert.equal(ninja.website, null, 'a blank source_url is null');
		assert.equal(ninja.logo, 'https://cdn.example.com/ninja.svg', 'brand_logo_url is the logo fallback');
		assert.equal(ninja.featured, false);
		assert.equal(ninja.updated_at, null);

		const timer = catalog.items.find((item) => item.slug === 'timer')!;
		assert.deepEqual(timer.category_ids, ['unknown-stuff']);
		assert.deepEqual(timer.categories, ['Unknown Stuff']);
	});
});

describe('buildCatalog: categories, tags, info', () => {
	const catalog = fixtureCatalog();

	it('lists every category of categories.yml with its item count and page URL', () => {
		assert.deepEqual(catalog.categories, [
			{
				id: 'time-tracking',
				name: 'Time Tracking',
				description: 'Track hours.',
				count: 3,
				url: 'https://tools.example.com/categories/time-tracking'
			},
			{
				id: 'invoicing',
				name: 'Invoicing',
				description: null,
				count: 1,
				url: 'https://tools.example.com/categories/invoicing'
			},
			{
				id: 'empty-category',
				name: 'Empty Category',
				description: null,
				count: 0,
				url: 'https://tools.example.com/categories/empty-category'
			}
		]);
	});

	it('sorts tags by count (desc), then name', () => {
		assert.deepEqual(
			catalog.tags.map((tag) => [tag.id, tag.count]),
			[
				['free', 2],
				['open-source', 2],
				['mobile', 1]
			]
		);
		assert.equal(catalog.tags[0].url, 'https://tools.example.com/tags/free');
	});

	it('builds DirectoryInfo with counts, newest update and absolute endpoints', () => {
		assert.deepEqual(catalog.info, {
			version: 1,
			name: 'Example Tools',
			description: 'The best time tracking tools.',
			url: 'https://tools.example.com',
			item_name: 'Tool',
			items_name: 'Tools',
			counts: { items: 4, categories: 3, tags: 3, collections: 2, comparisons: 1 },
			// The newest raw YAML value (published as written, like the minimal template).
			updated_at: '2026-11-05',
			data_repository: 'https://github.com/ever-works/awesome-time-tracking-data',
			submit_url: 'https://tools.example.com/submit',
			endpoints: {
				items: 'https://tools.example.com/data/items.json',
				item: 'https://tools.example.com/data/items/{slug}.json',
				categories: 'https://tools.example.com/data/categories.json',
				tags: 'https://tools.example.com/data/tags.json',
				openapi: 'https://tools.example.com/data/openapi.json',
				llms: 'https://tools.example.com/llms.txt',
				llms_full: 'https://tools.example.com/llms-full.txt',
				sitemap: 'https://tools.example.com/sitemap.xml',
				mcp: 'https://tools.example.com/mcp'
			},
			generator: 'ever-works'
		});
	});

	it('generates a description and default nouns when the config has none; mcp null when disabled', () => {
		const info = buildCatalog({
			...fixtureInput,
			description: '  ',
			itemName: undefined,
			itemsName: null,
			submitUrl: null,
			dataRepository: null,
			mcpEnabled: false
		}).info;
		assert.equal(info.description, 'A curated directory of 4 items.');
		assert.equal(info.item_name, 'Item');
		assert.equal(info.items_name, 'Items');
		assert.equal(info.submit_url, null);
		assert.equal(info.data_repository, null);
		assert.equal(info.endpoints.mcp, null);
	});

	it('wraps lists in versioned documents', () => {
		assert.deepEqual(Object.keys(itemsDocument(catalog.items)), ['version', 'total', 'items']);
		assert.equal(itemsDocument(catalog.items).total, 4);
		assert.equal(categoriesDocument(catalog.categories).total, 3);
		assert.equal(tagsDocument(catalog.tags).version, 1);
	});
});

describe('ItemDetail (dataset.getItem)', () => {
	it('adds markdown, markdown_url, absolute http(s) images, brand, publisher and related slugs', async () => {
		const toggl = await fixtureDataset().getItem('toggl');
		assert.ok(toggl);
		assert.equal(toggl.markdown, '# Toggl\n\nTrack time.');
		assert.equal(toggl.markdown_url, 'https://tools.example.com/items/toggl.md');
		assert.deepEqual(toggl.images, [
			'https://cdn.example.com/toggl-1.png',
			'https://tools.example.com/shots/toggl-2.png'
		]);
		assert.equal(toggl.brand, 'Toggl OÜ');
		assert.equal(toggl.publisher, null);
		assert.deepEqual(toggl.related, ['kimai', 'invoice-ninja']);
	});

	it('is null for an unknown slug and survives a failing Markdown read', async () => {
		const dataset = fixtureDataset();
		assert.equal(await dataset.getItem('nope'), null);

		const failing = await (await import('../dataset')).toDataset(fixtureCatalog(), async () => {
			throw new Error('EIO');
		});
		const ninja = await failing.getItem('invoice-ninja');
		assert.ok(ninja);
		assert.equal(ninja.markdown, null);
		assert.equal(ninja.publisher, 'Invoice Ninja LLC');
	});
});

describe('relatedSlugs', () => {
	it('scores shared tags (1 each) and a shared category (2), boosts featured, needs a shared term', () => {
		const items = fixtureCatalog().items;
		const kimai = items.find((item) => item.slug === 'kimai')!;
		// toggl: category +2, tag free +1, featured +0.5 = 3.5; invoice-ninja: category +2, open-source +1 = 3.
		assert.deepEqual(relatedSlugs(kimai, items), ['toggl', 'invoice-ninja']);
		const timer = items.find((item) => item.slug === 'timer')!;
		assert.deepEqual(relatedSlugs(timer, items), [], 'no shared term, no related items (featured alone is not enough)');
		assert.deepEqual(relatedSlugs(kimai, items, 1), ['toggl']);
	});
});

describe('helpers', () => {
	it('relationKey matches ids, names and slugs', () => {
		assert.equal(relationKey('Open Source'), 'open-source');
		assert.equal(relationKey(' Café  Tools '), 'cafe-tools');
		assert.equal(relationKey('open-source'), relationKey('Open-Source'));
	});

	it('absoluteUrl resolves relative paths and rejects other schemes', () => {
		assert.equal(absoluteUrl('/a.png', 'https://x.test'), 'https://x.test/a.png');
		assert.equal(absoluteUrl('data:image/png;base64,AA', 'https://x.test'), null);
		assert.equal(absoluteUrl('', 'https://x.test'), null);
		assert.equal(absoluteUrl(42, 'https://x.test'), 'https://x.test/42');
	});

	it('isoDate takes the first valid candidate', () => {
		assert.equal(isoDate(new Date('invalid'), 'not a date', '2026-01-02'), '2026-01-02T00:00:00.000Z');
		assert.equal(isoDate(undefined, null), null);
	});

	it('publicRepositoryUrl never publishes credentials', () => {
		assert.equal(publicRepositoryUrl('https://github.com/acme/data.git'), 'https://github.com/acme/data.git');
		assert.equal(publicRepositoryUrl('https://token@github.com/acme/data'), null);
		assert.equal(publicRepositoryUrl('https://user:pass@github.com/acme/data'), null);
		assert.equal(publicRepositoryUrl('git@github.com:acme/data.git'), null);
		assert.equal(publicRepositoryUrl('https://github.com/acme/data/?x=1#y'), 'https://github.com/acme/data');
		assert.equal(publicRepositoryUrl(undefined), null);
	});
});
