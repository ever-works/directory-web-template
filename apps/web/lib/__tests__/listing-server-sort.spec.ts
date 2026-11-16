import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ItemData } from '@/lib/content';

import { sortItems } from '../listing-server';

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
});
