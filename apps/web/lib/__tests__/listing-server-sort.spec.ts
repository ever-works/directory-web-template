import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { SORT_OPTIONS, sortItems as sortGridItems } from '@/components/shared-card/utils/sort-utils';
import type { ItemData } from '@/lib/content';

import { itemNameText, sortItems } from '../listing-server';

/**
 * Item YAML is not validated, so an unquoted `name: 1984` arrives as a number.
 * The name sorts (used by the collection page's JSON-LD and the listing grid)
 * must not throw on it.
 *
 * Run with: `npx tsx --test apps/web/lib/__tests__/listing-server-sort.spec.ts`
 */
function item(slug: string, name: unknown): ItemData {
	return { slug, name } as unknown as ItemData;
}

describe('sortItems name sorts', () => {
	it('sorts a numeric name as text instead of throwing', () => {
		const items = [item('b', 'Beta'), item('n', 1984), item('a', 'alpha')];
		assert.deepEqual(
			sortItems(items, 'name-asc').map((i) => i.slug),
			['n', 'a', 'b']
		);
		assert.deepEqual(
			sortItems(items, 'name-desc').map((i) => i.slug),
			['b', 'a', 'n']
		);
	});

	it('falls back to the slug for a missing or blank name', () => {
		const items = [item('zeta', undefined), item('alpha', '   '), item('mid', null)];
		assert.deepEqual(
			sortItems(items, 'name-asc').map((i) => i.slug),
			['alpha', 'mid', 'zeta']
		);
	});

	it('falls back to the slug for a boolean, list, map or non-finite name instead of sorting by its String()', () => {
		// String(true) is 'true', String(['a']) is 'a' and String({}) is '[object Object]': each would
		// sort by a made-up name. The slugs put them last here; the made-up names would not.
		const items = [
			item('zz-bool', true),
			item('zz-list', ['aaa']),
			item('zz-map', { en: 'aaa' }),
			item('zz-nan', Number.NaN),
			item('b', 'Beta')
		];
		assert.deepEqual(
			sortItems(items, 'name-asc').map((i) => i.slug),
			['b', 'zz-bool', 'zz-list', 'zz-map', 'zz-nan']
		);
	});
});

describe('collection page name sort (JSON-LD order and the grid default)', () => {
	const page = readFileSync(join(__dirname, '../../app/[locale]/collections/[slug]/page.tsx'), 'utf8').replace(
		/\s+/g,
		' '
	);

	it('normalizes item names with itemNameText before the name sort', () => {
		const normalize = page.indexOf('name: itemNameText(item.name)');
		const sort = page.indexOf('sortItems(collectionItems, SORT_OPTIONS.NAME_ASC)');
		assert.ok(normalize > 0, 'the collection page does not normalize item names');
		assert.ok(sort > normalize, 'the collection page sorts names it has not normalized');
	});

	it("the grid's sortItems does not throw on names normalized that way", () => {
		const items = [item('b', 'Beta'), item('n', 1984), item('t', true), item('a', 'alpha')].map((it) => ({
			...it,
			name: itemNameText(it.name)
		}));
		assert.deepEqual(
			sortGridItems(items, SORT_OPTIONS.NAME_ASC).map((i) => i.slug),
			['t', 'n', 'a', 'b']
		);
	});
});

describe('itemNameText', () => {
	it('keeps text, trimmed, and reads a finite number as its text', () => {
		assert.equal(itemNameText('  Alpha '), 'Alpha');
		assert.equal(itemNameText(1984), '1984');
		assert.equal(itemNameText(0), '0');
		assert.equal(itemNameText(-2.5), '-2.5');
	});

	it('treats every other value as blank', () => {
		for (const value of [undefined, null, true, false, Number.NaN, Infinity, ['a'], { en: 'a' }]) {
			assert.equal(itemNameText(value), '', `${JSON.stringify(value)} is not blank`);
		}
	});
});
