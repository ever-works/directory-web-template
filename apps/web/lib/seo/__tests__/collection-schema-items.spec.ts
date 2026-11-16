import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_COLLECTION_SCHEMA_ITEMS, generateCollectionSchema } from '../schema';

/**
 * `generateCollectionSchema` lists the collection's items as `itemListElement`
 * so search engines can see which listings the collection holds.
 *
 * Run with: `npx tsx --test apps/web/lib/seo/__tests__/collection-schema-items.spec.ts`
 */

const base = {
	name: 'Best tools',
	url: 'https://example.com/collections/best-tools'
};

const mainEntity = (schema: Record<string, unknown>) => schema.mainEntity as Record<string, unknown> | undefined;

describe('generateCollectionSchema itemListElement', () => {
	it('lists items in order with 1-based positions', () => {
		const schema = generateCollectionSchema({
			...base,
			itemCount: 2,
			items: [
				{ name: 'Alpha', url: 'https://example.com/items/alpha' },
				{ name: 'Beta', url: 'https://example.com/items/beta' }
			]
		});
		assert.deepEqual(mainEntity(schema), {
			'@type': 'ItemList',
			numberOfItems: 2,
			itemListElement: [
				{ '@type': 'ListItem', position: 1, name: 'Alpha', url: 'https://example.com/items/alpha' },
				{ '@type': 'ListItem', position: 2, name: 'Beta', url: 'https://example.com/items/beta' }
			]
		});
	});

	it('drops entries without a name or url and renumbers positions', () => {
		const schema = generateCollectionSchema({
			...base,
			items: [
				{ name: '  ', url: 'https://example.com/items/blank' },
				{ name: 'Alpha', url: 'https://example.com/items/alpha' },
				{ name: 'No url', url: '' },
				{ name: 'Beta', url: 'https://example.com/items/beta' }
			]
		});
		const list = mainEntity(schema)?.itemListElement as Array<Record<string, unknown>>;
		assert.deepEqual(
			list.map((entry) => [entry.position, entry.name]),
			[
				[1, 'Alpha'],
				[2, 'Beta']
			]
		);
		// Without an explicit itemCount the count follows what is listed.
		assert.equal(mainEntity(schema)?.numberOfItems, 2);
	});

	it('caps the list but keeps the true item count', () => {
		const items = Array.from({ length: MAX_COLLECTION_SCHEMA_ITEMS + 25 }, (_, i) => ({
			name: `Item ${i}`,
			url: `https://example.com/items/${i}`
		}));
		const schema = generateCollectionSchema({ ...base, itemCount: items.length, items });
		const list = mainEntity(schema)?.itemListElement as unknown[];
		assert.equal(list.length, MAX_COLLECTION_SCHEMA_ITEMS);
		assert.equal(mainEntity(schema)?.numberOfItems, MAX_COLLECTION_SCHEMA_ITEMS + 25);
	});

	it('without an itemCount, a capped list still reports every valid item', () => {
		const total = MAX_COLLECTION_SCHEMA_ITEMS + 25;
		const items = Array.from({ length: total }, (_, i) => ({
			name: `Item ${i}`,
			url: `https://example.com/items/${i}`
		}));
		const entity = mainEntity(generateCollectionSchema({ ...base, items }));
		assert.equal((entity?.itemListElement as unknown[]).length, MAX_COLLECTION_SCHEMA_ITEMS);
		assert.equal(entity?.numberOfItems, total);
	});

	it('does not throw on a non-string name from item YAML', () => {
		// `yaml.parse('name: 1984')` gives a number; a missing key gives undefined, an empty one null.
		const items = [
			{ name: 1984, url: 'https://example.com/items/1984' },
			{ name: undefined, url: 'https://example.com/items/missing' },
			{ name: null, url: 'https://example.com/items/empty' },
			{ name: 'Beta', url: 'https://example.com/items/beta' }
		] as unknown as Array<{ name: string; url: string }>;
		const schema = generateCollectionSchema({ ...base, itemCount: 4, items });
		const list = mainEntity(schema)?.itemListElement as Array<Record<string, unknown>>;
		assert.deepEqual(
			list.map((entry) => [entry.position, entry.name]),
			[
				[1, '1984'],
				[2, 'Beta']
			]
		);
	});

	it('lists a repeated URL once', () => {
		const schema = generateCollectionSchema({
			...base,
			items: [
				{ name: 'Alpha', url: 'https://example.com/items/alpha' },
				{ name: 'Alpha', url: 'https://example.com/items/alpha' },
				{ name: 'Beta', url: 'https://example.com/items/beta' }
			]
		});
		const list = mainEntity(schema)?.itemListElement as Array<Record<string, unknown>>;
		assert.deepEqual(
			list.map((entry) => [entry.position, entry.url]),
			[
				[1, 'https://example.com/items/alpha'],
				[2, 'https://example.com/items/beta']
			]
		);
		assert.equal(mainEntity(schema)?.numberOfItems, 2);
	});

	it('keeps the old shape when no items are given', () => {
		assert.deepEqual(mainEntity(generateCollectionSchema({ ...base, itemCount: 3 })), {
			'@type': 'ItemList',
			numberOfItems: 3
		});
		assert.deepEqual(mainEntity(generateCollectionSchema({ ...base, itemCount: 0, items: [] })), {
			'@type': 'ItemList',
			numberOfItems: 0
		});
		assert.equal('mainEntity' in generateCollectionSchema({ ...base }), false);
	});
});
