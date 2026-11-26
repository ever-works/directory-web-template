import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { ItemData } from '@/lib/types/item';
import { isLocationIndexable } from '../location-indexable';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `item_location_index` has no status column, and `GET /api/location/coordinates`, `/search`,
 * `/cities` and `/countries` answer anyone from it. `LocationIndexService.indexItem` and
 * `rebuildIndex` indexed every item with a location, so an anonymous request returned the slugs and
 * exact coordinates of draft, pending and rejected items (T-2840). Only an approved, non-deleted
 * item with a location is indexed now; `indexItem` removes the row of any other item, and a review
 * updates the row. The service and the routes import the DB layer, which cannot load under
 * `tsx --test`, so the wiring checks at the end read the source.
 */

const LOCATION = { latitude: 48.8566, longitude: 2.3522, city: 'Paris', country: 'France' };

function item(slug: string, overrides: Partial<ItemData> = {}): ItemData {
	return {
		id: slug,
		name: slug,
		slug,
		description: `Fixture ${slug}`,
		source_url: `https://example.com/${slug}`,
		category: [],
		tags: [],
		updated_at: '2026-11-26 00:00',
		status: 'approved',
		location: LOCATION,
		...overrides
	};
}

describe('isLocationIndexable', () => {
	it('is true for an approved item with a location', () => {
		assert.equal(isLocationIndexable(item('approved')), true);
	});

	it('is true for an approved remote-only item', () => {
		assert.equal(isLocationIndexable(item('remote', { location: { is_remote: true } })), true);
	});

	for (const status of ['draft', 'pending', 'rejected'] as const) {
		it(`is false for a ${status} item with a location`, () => {
			assert.equal(isLocationIndexable(item(status, { status })), false);
		});
	}

	it('is false for a soft-deleted approved item with a location', () => {
		assert.equal(isLocationIndexable(item('deleted', { deleted_at: '2026-11-26T00:00:00.000Z' })), false);
	});

	it('is false for an approved item without a location', () => {
		assert.equal(isLocationIndexable(item('no-location', { location: undefined })), false);
	});

	it('is false for a status that is not exactly "approved"', () => {
		for (const status of ['Approved', 'published', '', undefined]) {
			const candidate = item(`status-${String(status)}`, { status: status as ItemData['status'] });
			assert.equal(isLocationIndexable(candidate), false, `status ${JSON.stringify(status)}`);
		}
	});
});

describe('location index rebuild filter', () => {
	// The list `rebuildIndex` gets from `itemRepository.findAll()` (admin rebuild and content sync)
	const items = [
		item('approved-one'),
		item('draft-one', { status: 'draft' }),
		item('pending-one', { status: 'pending' }),
		item('rejected-one', { status: 'rejected' }),
		item('deleted-one', { deleted_at: '2026-11-26T00:00:00.000Z' }),
		item('no-location-one', { location: undefined }),
		item('approved-remote', { location: { is_remote: true, service_area: 'Worldwide' } })
	];

	it('keeps only the approved, non-deleted items with a location', () => {
		assert.deepEqual(
			items.filter(isLocationIndexable).map((entry) => entry.slug),
			['approved-one', 'approved-remote']
		);
	});

	const service = readFileSync(join(__dirname, '../../services/location/location-index.service.ts'), 'utf8').replace(
		/\s+/g,
		' '
	);
	const rebuildStart = service.indexOf('async rebuildIndex(items: ItemData[])');
	const rebuild = service.slice(rebuildStart, service.indexOf('private async prepareLocationEntry(', rebuildStart));

	it('rebuildIndex clears the index, then indexes only the items the helper keeps', () => {
		assert.ok(rebuildStart >= 0, 'rebuildIndex not found');
		const clear = rebuild.indexOf('await clearLocationIndex();');
		const filter = rebuild.indexOf('const indexableItems = items.filter(isLocationIndexable);');
		assert.ok(clear >= 0, 'rebuildIndex no longer clears the index first');
		assert.ok(filter > clear, 'rebuildIndex does not filter the items with isLocationIndexable after clearing');
		assert.ok(
			rebuild.includes('for (const item of indexableItems) {'),
			'rebuildIndex does not index the filtered list'
		);
		assert.ok(
			rebuild.includes('result.skipped += items.length - indexableItems.length;'),
			'the items the filter drops are not counted as skipped'
		);
		assert.ok(
			!/items\.filter\(\(item\) => item\.location\)/.test(rebuild),
			'rebuildIndex still keeps every item with a location'
		);
	});

	it('prepareLocationEntry skips an item the helper rejects', () => {
		const start = service.indexOf('private async prepareLocationEntry(');
		const body = service.slice(start, service.indexOf('const locationData = item.location;', start));
		assert.ok(
			body.includes('if (!isLocationIndexable(item)) { return { success: false, skipped: true }; }'),
			'prepareLocationEntry does not skip an item that is not indexable'
		);
	});
});

describe('location index wiring', () => {
	const service = readFileSync(join(__dirname, '../../services/location/location-index.service.ts'), 'utf8').replace(
		/\s+/g,
		' '
	);

	it('indexItem removes the row of an item that is not indexable before anything is written', () => {
		const start = service.indexOf('async indexItem(item: ItemData)');
		const end = service.indexOf('async removeFromIndex(slug: string)', start);
		const body = service.slice(start, end);
		const gate = body.indexOf('if (!isLocationIndexable(item)) {');
		assert.ok(gate >= 0, 'indexItem does not check isLocationIndexable');
		const remove = body.indexOf('await removeFromLocationIndex(item.slug);', gate);
		const firstUpsert = body.indexOf('upsertLocationIndex(');
		assert.ok(remove > gate, 'indexItem does not remove the row of an item that is not indexable');
		assert.ok(firstUpsert > remove, 'indexItem can write a row before the indexable check');
		assert.ok(
			body.indexOf('result.removed = true;', remove) > remove,
			'indexItem does not report a completed removal'
		);
		assert.ok(!body.includes('if (!item.location) {'), 'indexItem still checks only for a location');
	});

	it('indexItem and removeFromIndex run one write at a time per slug', () => {
		assert.ok(
			service.includes('private slugWrites = createKeyedSerialQueue();'),
			'the service has no per-slug queue'
		);
		assert.ok(
			service.includes(
				'async indexItem(item: ItemData): Promise<IndexItemResult> { return this.slugWrites.run(item.slug, () => this.writeIndexEntry(item)); }'
			),
			'indexItem does not go through the per-slug queue'
		);
		assert.ok(
			service.includes(
				'async removeFromIndex(slug: string): Promise<boolean> { return this.slugWrites.run(slug, () => removeFromLocationIndex(slug)); }'
			),
			'removeFromIndex does not go through the per-slug queue'
		);
	});

	const git = readFileSync(join(__dirname, '../../services/item-git.service.ts'), 'utf8').replace(/\s+/g, ' ');

	it('the git service syncs the index row of every item it indexes, located or not', () => {
		const start = git.indexOf('private indexLocationAsync(item: ItemData): void {');
		const body = git.slice(start, git.indexOf('private removeLocationIndexAsync(', start));
		assert.ok(start >= 0, 'indexLocationAsync not found');
		assert.ok(body.includes('indexService.indexItem(item)'), 'indexLocationAsync does not call indexItem');
		assert.ok(!body.includes('if (!item.location) return;'), 'indexLocationAsync skips an item without a location');
	});

	it('reviewItem updates the index row after it writes the new status', () => {
		const start = git.indexOf('async reviewItem(id: string, reviewData: ReviewRequest)');
		const body = git.slice(start, git.indexOf('async deleteItem(id: string)', start));
		const write = body.indexOf('await this.writeItem(updatedItem);');
		assert.ok(write >= 0, 'reviewItem does not write the item');
		assert.ok(
			body.indexOf('this.indexLocationAsync(updatedItem);') > write,
			'reviewItem does not update the index'
		);
	});

	it('the admin review route waits for the index update before it answers', () => {
		const route = readFileSync(
			join(__dirname, '../../../app/api/admin/items/[id]/review/route.ts'),
			'utf8'
		).replace(/\s+/g, ' ');
		const review = route.indexOf('const item = await itemRepository.review(');
		const gate = route.indexOf('if (getLocationEnabled()) {', review);
		assert.ok(review >= 0, 'the route does not review the item');
		assert.ok(gate > review, 'the route does not update the index after the review');
		const call = route.indexOf('const indexResult = await getLocationIndexService().indexItem(item);', gate);
		assert.ok(call > gate, 'the route does not wait for indexItem');
		const outcome = route.indexOf('if (indexResult.success || indexResult.removed) {', call);
		assert.ok(outcome > call, 'the route does not tell a completed removal from a failed one');
		assert.ok(
			route.indexOf("status: 'error'", outcome) > outcome,
			'a failed index update after the review is not logged as an error'
		);
		assert.ok(
			route.indexOf('return NextResponse.json({ success: true,', gate) > gate,
			'the index update runs after the response'
		);
	});
});
