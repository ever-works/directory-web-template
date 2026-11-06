import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ItemData } from '@/lib/types/item';
import { withClientEngagement, type PerItemCountLookup } from '../client-item-engagement';

/**
 * The engagement numbers on a client's own submissions (`GET /api/client/items`
 * and `GET /api/client/items/:id`). `likes` used to be hardcoded to `0`, so the
 * Likes stat on an approved submission never moved no matter how many votes the
 * item received.
 *
 * Run with: `pnpm --filter @ever-works/web test:unit`
 */

function item(slug: string): ItemData {
	return { id: `id-${slug}`, slug, name: slug, status: 'approved' } as ItemData;
}

function lookup(counts: Record<string, number>, calls: string[][] = []): PerItemCountLookup {
	return async (itemSlugs) => {
		calls.push(itemSlugs);
		return new Map(Object.entries(counts).filter(([slug]) => itemSlugs.includes(slug)));
	};
}

describe('withClientEngagement', () => {
	it('reports each item vote score as its likes', async () => {
		const result = await withClientEngagement([item('alpha'), item('beta')], {
			views: lookup({ alpha: 7, beta: 2 }),
			likes: lookup({ alpha: 3, beta: 12 })
		});

		assert.deepEqual(
			result.map(({ slug, views, likes }) => ({ slug, views, likes })),
			[
				{ slug: 'alpha', views: 7, likes: 3 },
				{ slug: 'beta', views: 2, likes: 12 }
			]
		);
	});

	it('keeps likes and views independent of each other', async () => {
		const [result] = await withClientEngagement([item('alpha')], {
			views: lookup({ alpha: 40 }),
			likes: lookup({})
		});

		assert.equal(result.views, 40);
		assert.equal(result.likes, 0);
	});

	it('passes a net-negative vote score through unchanged', async () => {
		const [result] = await withClientEngagement([item('alpha')], {
			views: lookup({}),
			likes: lookup({ alpha: -2 })
		});

		assert.equal(result.likes, -2);
	});

	it('defaults items with no recorded views or votes to 0', async () => {
		const result = await withClientEngagement([item('alpha'), item('quiet')], {
			views: lookup({ alpha: 1 }),
			likes: lookup({ alpha: 1 })
		});

		assert.deepEqual(
			result.map(({ views, likes }) => ({ views, likes })),
			[
				{ views: 1, likes: 1 },
				{ views: 0, likes: 0 }
			]
		);
	});

	it('looks each metric up once per page, with every slug in the page', async () => {
		const viewCalls: string[][] = [];
		const likeCalls: string[][] = [];
		await withClientEngagement([item('alpha'), item('beta'), item('gamma')], {
			views: lookup({}, viewCalls),
			likes: lookup({}, likeCalls)
		});

		assert.deepEqual(viewCalls, [['alpha', 'beta', 'gamma']]);
		assert.deepEqual(likeCalls, [['alpha', 'beta', 'gamma']]);
	});

	it('preserves the item fields and order', async () => {
		const input = [item('beta'), item('alpha')];
		const result = await withClientEngagement(input, { views: lookup({}), likes: lookup({}) });

		assert.deepEqual(
			result.map(({ id, slug, name, status }) => ({ id, slug, name, status })),
			input.map(({ id, slug, name, status }) => ({ id, slug, name, status }))
		);
	});

	it('skips both lookups for an empty page', async () => {
		const calls: string[][] = [];
		const result = await withClientEngagement([], { views: lookup({}, calls), likes: lookup({}, calls) });

		assert.deepEqual(result, []);
		assert.deepEqual(calls, []);
	});
});
