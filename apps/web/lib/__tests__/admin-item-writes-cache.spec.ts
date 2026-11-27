import assert from 'node:assert/strict';
import Module from 'node:module';
import { beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * The admin item routes wrote the item file and cleared no cache. `fetchItems` (`lib/content.ts`)
 * keeps the public listing in memory for 10 minutes whenever NODE_ENV is not development, and the
 * listing pages, `GET /api/items/listing` and `GET /api/items/engagement` read it. So after an
 * admin rejected or deleted an approved item, its page answered 404 at once (`fetchItem` reads the
 * file) while the listing kept showing it until the next content sync or the end of the TTL, and a
 * new or newly approved item was missing from the listing for as long. The admin category, tag and
 * collection routes already called `invalidateContentCaches()` after a write; the item routes now
 * do too: create, update, delete, review, and bulk approve, reject or delete (once per request,
 * after the loop, when at least one item was written) (T-2865).
 *
 * The real route modules are loaded with `next/server`, the admin guard, the item repository, the
 * notification, location, settings and activity-feed modules and `lib/cache-invalidation` replaced.
 * The repository stub keeps the items in a map and records each write in `events`, as the cache
 * stub records each `invalidateContentCaches()` call, so a test reads the order of the two. The
 * module graph is CommonJS under `tsx --test`, so intercepting `Module._load` is enough.
 */
type Handler = (request: Request, context?: unknown) => Promise<Response>;
type StoredItem = { id: string; slug: string; name: string; status: string; submitted_by?: string };

const ADMIN_SESSION = { user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' } };

const state = {
	session: ADMIN_SESSION as typeof ADMIN_SESSION | null,
	items: new Map<string, StoredItem>(),
	/** Ids whose write throws, as a failed file write or git operation does. */
	failing: new Set<string>(),
	/** Each repository write (`create:<id>`, `update:<id>`, ...) and each cache invalidation, in order. */
	events: [] as string[]
};

class StubNextResponse extends Response {
	static json(body: unknown, init?: ResponseInit) {
		return new StubNextResponse(JSON.stringify(body), {
			...init,
			headers: { 'content-type': 'application/json' }
		});
	}
}

class StubDuplicateItemError extends Error {}

function write(kind: string, id: string): StoredItem {
	if (state.failing.has(id)) throw new Error(`Git operation failed for ${id}`);
	const item = state.items.get(id);
	if (kind !== 'create' && !item) throw new Error(`Item with id '${id}' not found`);
	state.events.push(`${kind}:${id}`);
	return item as StoredItem;
}

class StubItemRepository {
	async findById(id: string) {
		return state.items.get(id) ?? null;
	}
	async checkDuplicateId(id: string) {
		return state.items.has(id);
	}
	async checkDuplicateSlug(slug: string) {
		return [...state.items.values()].some((item) => item.slug === slug);
	}
	async create(data: StoredItem) {
		if (data.id.startsWith('race-')) throw new StubDuplicateItemError(`Item with ID '${data.id}' already exists`);
		write('create', data.id);
		const item = { id: data.id, slug: data.slug, name: data.name, status: data.status };
		state.items.set(item.id, item);
		return item;
	}
	async update(id: string, data: Partial<StoredItem>) {
		const item = write('update', id);
		const updated = { ...item, ...data, id };
		state.items.set(id, updated);
		return updated;
	}
	async review(id: string, data: { status: string }) {
		const item = write('review', id);
		const reviewed = { ...item, status: data.status };
		state.items.set(id, reviewed);
		return reviewed;
	}
	async delete(id: string) {
		write('delete', id);
		state.items.delete(id);
	}
}

const adminGuard = async () => {
	if (!state.session) return StubNextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
	return { session: state.session };
};

const stubs: Record<string, unknown> = {
	'server-only': {},
	'next/server': { NextResponse: StubNextResponse, NextRequest: Request },
	'@/lib/auth/admin-guard': {
		requireAdminSession: adminGuard,
		checkAdminAuth: async () => {
			const result = await adminGuard();
			return result instanceof StubNextResponse ? result : null;
		}
	},
	'@/lib/repositories/item.repository': { ItemRepository: StubItemRepository },
	'@/lib/repositories/user.repository': {
		UserRepository: class {
			async findById() {
				return null;
			}
		}
	},
	'@/lib/services/item-git.service': { DuplicateItemError: StubDuplicateItemError },
	'@/lib/services/email-notification.service': {
		EmailNotificationService: { sendSubmissionDecisionEmail: async () => ({ success: true }) }
	},
	'@/lib/services/platform-activity-feed/push-client': { emitActivityEvent: async () => undefined },
	'@/lib/services/location': {
		getLocationIndexService: () => ({
			indexItem: async () => ({ success: true }),
			removeFromIndex: async () => undefined
		})
	},
	'@/lib/utils/settings': { getLocationEnabled: () => false },
	'@/lib/cache-invalidation': {
		invalidateContentCaches: async () => {
			state.events.push('invalidate');
			return true;
		}
	}
};

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return originalLoad.call(this, request, ...rest);
};
const itemsRoute = require('../../app/api/admin/items/route') as { POST: Handler };
const itemRoute = require('../../app/api/admin/items/[id]/route') as { PUT: Handler; DELETE: Handler };
const reviewRoute = require('../../app/api/admin/items/[id]/review/route') as { POST: Handler };
const bulkRoute = require('../../app/api/admin/items/bulk/route') as { POST: Handler };
loader._load = originalLoad;

const jsonRequest = (method: string, url: string, payload?: unknown) =>
	new Request(new URL(url, 'http://localhost'), {
		method,
		headers: { 'content-type': 'application/json' },
		body: payload === undefined ? undefined : JSON.stringify(payload)
	});
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const REJECTION_NOTES = 'Not a fit for this directory';

function seed(...items: Array<[id: string, status: string]>) {
	for (const [id, status] of items) state.items.set(id, { id, slug: id, name: `Item ${id}`, status });
}

beforeEach(() => {
	state.session = ADMIN_SESSION;
	state.items.clear();
	state.failing.clear();
	state.events = [];
});

describe('POST /api/admin/items clears the content caches after a create', () => {
	const body = {
		id: 'new-item',
		name: 'New item',
		slug: 'new-item',
		description: 'A new item',
		source_url: 'https://example.com/new-item',
		status: 'approved'
	};
	const create = (payload: unknown) => itemsRoute.POST(jsonRequest('POST', '/api/admin/items', payload));

	it('invalidates once, after the item is written', async () => {
		const response = await create(body);
		assert.equal(response.status, 201);
		assert.deepEqual(state.events, ['create:new-item', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		state.session = null;
		const response = await create(body);
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when a required field is missing (400)', async () => {
		const response = await create({ ...body, source_url: undefined });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the id is taken (409)', async () => {
		seed(['new-item', 'approved']);
		const response = await create(body);
		assert.equal(response.status, 409);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when another request took the id meanwhile (409)', async () => {
		const response = await create({ ...body, id: 'race-item', slug: 'race-item' });
		assert.equal(response.status, 409);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		state.failing.add('new-item');
		const response = await create(body);
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('PUT /api/admin/items/[id] clears the content caches after an update', () => {
	const update = (id: string, payload: unknown) =>
		itemRoute.PUT(jsonRequest('PUT', `/api/admin/items/${id}`, payload), params(id));

	it('invalidates once, after the item is written', async () => {
		seed(['listed', 'approved']);
		const response = await update('listed', { status: 'draft' });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['update:listed', 'invalidate']);
	});

	it('invalidates after a rejection with a reason', async () => {
		seed(['listed', 'approved']);
		const response = await update('listed', { status: 'rejected', review_notes: REJECTION_NOTES });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['update:listed', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed(['listed', 'approved']);
		state.session = null;
		const response = await update('listed', { status: 'draft' });
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for a status that is not an item status (400)', async () => {
		seed(['listed', 'approved']);
		const response = await update('listed', { status: 'published' });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when a rejection has no reason (400)', async () => {
		seed(['listed', 'approved']);
		const response = await update('listed', { status: 'rejected' });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when rejecting an unknown item (404)', async () => {
		const response = await update('missing', { status: 'rejected', review_notes: REJECTION_NOTES });
		assert.equal(response.status, 404);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		seed(['listed', 'approved']);
		state.failing.add('listed');
		const response = await update('listed', { status: 'draft' });
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('DELETE /api/admin/items/[id] clears the content caches after a delete', () => {
	const remove = (id: string) => itemRoute.DELETE(jsonRequest('DELETE', `/api/admin/items/${id}`), params(id));

	it('invalidates once, after the item is deleted', async () => {
		seed(['listed', 'approved']);
		const response = await remove('listed');
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['delete:listed', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed(['listed', 'approved']);
		state.session = null;
		const response = await remove('listed');
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the delete fails (500)', async () => {
		const response = await remove('missing');
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('POST /api/admin/items/[id]/review clears the content caches after a review', () => {
	const review = (id: string, payload: unknown) =>
		reviewRoute.POST(jsonRequest('POST', `/api/admin/items/${id}/review`, payload), params(id));

	it('invalidates once, after an approval is written', async () => {
		seed(['waiting', 'pending']);
		const response = await review('waiting', { status: 'approved' });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['review:waiting', 'invalidate']);
	});

	it('invalidates once, after a rejection is written', async () => {
		seed(['listed', 'approved']);
		const response = await review('listed', { status: 'rejected', review_notes: REJECTION_NOTES });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['review:listed', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed(['waiting', 'pending']);
		state.session = null;
		const response = await review('waiting', { status: 'approved' });
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for a status other than approved or rejected (400)', async () => {
		seed(['waiting', 'pending']);
		const response = await review('waiting', { status: 'draft' });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when a rejection has no reason (400)', async () => {
		seed(['listed', 'approved']);
		const response = await review('listed', { status: 'rejected' });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		seed(['waiting', 'pending']);
		state.failing.add('waiting');
		const response = await review('waiting', { status: 'approved' });
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('POST /api/admin/items/bulk clears the content caches once after the loop', () => {
	const bulk = (payload: unknown) => bulkRoute.POST(jsonRequest('POST', '/api/admin/items/bulk', payload));
	const summary = async (response: Response) =>
		((await response.json()) as { summary: { successful: number; failed: number } }).summary;

	it('invalidates once after approving several items', async () => {
		seed(['a', 'pending'], ['b', 'pending']);
		const response = await bulk({ action: 'approve', ids: ['a', 'b'] });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['review:a', 'review:b', 'invalidate']);
	});

	it('invalidates once after rejecting several items', async () => {
		seed(['a', 'pending'], ['b', 'pending']);
		const response = await bulk({ action: 'reject', ids: ['a', 'b'], reason: REJECTION_NOTES });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['review:a', 'review:b', 'invalidate']);
	});

	it('invalidates once after deleting several items', async () => {
		seed(['a', 'approved'], ['b', 'approved']);
		const response = await bulk({ action: 'delete', ids: ['a', 'b'] });
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['delete:a', 'delete:b', 'invalidate']);
	});

	it('invalidates once when only some of the items are written', async () => {
		seed(['a', 'approved'], ['b', 'approved']);
		state.failing.add('a');
		const response = await bulk({ action: 'delete', ids: ['a', 'b', 'missing'] });
		assert.equal(response.status, 200);
		assert.deepEqual(await summary(response), { total: 3, successful: 1, failed: 2 });
		assert.deepEqual(state.events, ['delete:b', 'invalidate']);
	});

	it('does not invalidate when no item is waiting for review', async () => {
		seed(['a', 'approved'], ['b', 'draft']);
		const response = await bulk({ action: 'approve', ids: ['a', 'b'] });
		assert.equal(response.status, 200);
		assert.deepEqual(await summary(response), { total: 2, successful: 0, failed: 2 });
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when every write fails', async () => {
		seed(['a', 'approved']);
		state.failing.add('a');
		const response = await bulk({ action: 'delete', ids: ['a', 'missing'] });
		assert.equal(response.status, 200);
		assert.deepEqual(await summary(response), { total: 2, successful: 0, failed: 2 });
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed(['a', 'pending']);
		state.session = null;
		const response = await bulk({ action: 'approve', ids: ['a'] });
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an unknown action (400)', async () => {
		seed(['a', 'pending']);
		const response = await bulk({ action: 'publish', ids: ['a'] });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when a bulk rejection has no reason (400)', async () => {
		seed(['a', 'pending']);
		const response = await bulk({ action: 'reject', ids: ['a'] });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});
});
