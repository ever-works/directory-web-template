import assert from 'node:assert/strict';
import Module from 'node:module';
import { beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `PUT` and `DELETE /api/client/items/[id]` and `POST /api/client/items/[id]/restore` wrote the
 * item file and cleared no cache. `fetchItems` (`lib/content.ts`) keeps the public listing in
 * memory for 10 minutes whenever NODE_ENV is not development, and the listing pages,
 * `GET /api/items/listing` and `GET /api/items/engagement` read it. So after a client edited an
 * approved item (which moves it back to pending), deleted it or restored it, the listing kept the
 * old state for up to 10 minutes, and a card could link to a page that answered 404. The three
 * routes now call `invalidateContentCaches()` after a successful write, as the admin item routes
 * do (T-2865) (T-2872).
 *
 * The real routes and the real `ClientItemRepository` (ownership checks, approved to pending) are
 * loaded with `next/server`, `@/lib/auth`, the item repository, the view queries and
 * `lib/cache-invalidation` replaced. The item repository stub keeps the items in a map and records
 * each write in `events`, as the cache stub records each `invalidateContentCaches()` call, so a
 * test reads the order of the two. The module graph is CommonJS under `tsx --test`, so
 * intercepting `Module._load` is enough.
 */
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
type StoredItem = {
	id: string;
	slug: string;
	name: string;
	description: string;
	status: string;
	submitted_by: string;
	deleted_at?: string;
};

const OWNER = 'user-owner';
const sessionFor = (id: string) => ({ user: { id, name: 'Client', email: `${id}@example.com` } });

const state = {
	session: sessionFor(OWNER) as ReturnType<typeof sessionFor> | null,
	items: new Map<string, StoredItem>(),
	/** Ids whose write throws, as a failed file write or git operation does. */
	failing: new Set<string>(),
	/** Each repository write (`update:<id>`, `soft-delete:<id>`, ...) and each cache invalidation, in order. */
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

function write(kind: string, id: string): StoredItem {
	if (state.failing.has(id)) throw new Error(`Git operation failed for ${id}`);
	const item = state.items.get(id);
	if (!item) throw new Error(`Item with id '${id}' not found`);
	state.events.push(`${kind}:${id}`);
	return item;
}

class StubItemRepository {
	async findById(id: string, includeDeleted = false) {
		const item = state.items.get(id);
		if (!item || (item.deleted_at && !includeDeleted)) return null;
		return item;
	}
	async update(id: string, data: Partial<StoredItem>) {
		const updated = { ...write('update', id), ...data, id };
		state.items.set(id, updated);
		return updated;
	}
	async softDelete(id: string) {
		const deleted = { ...write('soft-delete', id), deleted_at: '2026-11-27 12:00' };
		state.items.set(id, deleted);
		return deleted;
	}
	async restore(id: string) {
		const restored = { ...write('restore', id) };
		delete restored.deleted_at;
		state.items.set(id, restored);
		return restored;
	}
}

const stubs: Record<string, unknown> = {
	'server-only': {},
	'next/server': { NextResponse: StubNextResponse, NextRequest: Request },
	'next-auth': {},
	'@/lib/auth': { auth: async () => state.session },
	'@/lib/repositories/item.repository': { ItemRepository: StubItemRepository },
	'@/lib/db/queries/item-view.queries': { getViewsPerItem: async () => new Map<string, number>() },
	'@/lib/cache-invalidation': {
		invalidateContentCaches: async () => {
			state.events.push('invalidate');
			return true;
		}
	}
};

const loader = Module as unknown as {
	_load: (request: string, parent?: { filename?: string }, ...rest: unknown[]) => unknown;
};
const originalLoad = loader._load;
loader._load = function (this: unknown, request: string, parent?: { filename?: string }, ...rest: unknown[]) {
	if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	// client-item.repository.ts imports the item repository by a relative path
	if (request === './item.repository' && /client-item\.repository\.ts$/.test(parent?.filename ?? '')) {
		return stubs['@/lib/repositories/item.repository'];
	}
	return originalLoad.call(this, request, parent, ...rest);
};
const itemRoute = require('../../app/api/client/items/[id]/route') as { PUT: Handler; DELETE: Handler };
const restoreRoute = require('../../app/api/client/items/[id]/restore/route') as { POST: Handler };
loader._load = originalLoad;

const jsonRequest = (method: string, url: string, payload?: unknown) =>
	new Request(new URL(url, 'http://localhost'), {
		method,
		headers: { 'content-type': 'application/json' },
		body: payload === undefined ? undefined : JSON.stringify(payload)
	});
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function seed(id: string, status: string, extra: Partial<StoredItem> = {}) {
	state.items.set(id, {
		id,
		slug: id,
		name: `Item ${id}`,
		description: `Client item ${id} in the directory`,
		status,
		submitted_by: OWNER,
		...extra
	});
}

beforeEach(() => {
	state.session = sessionFor(OWNER);
	state.items.clear();
	state.failing.clear();
	state.events = [];
});

describe('PUT /api/client/items/[id] clears the content caches after an edit', () => {
	const edit = (id: string, payload: unknown) =>
		itemRoute.PUT(jsonRequest('PUT', `/api/client/items/${id}`, payload), params(id));
	const EDIT = { description: 'A new description for the item' };

	it('invalidates once, after an approved item is edited (and moved to pending)', async () => {
		seed('listed', 'approved');
		const response = await edit('listed', EDIT);
		assert.equal(response.status, 200);
		assert.equal(((await response.json()) as { statusChanged: boolean }).statusChanged, true);
		assert.equal(state.items.get('listed')?.status, 'pending');
		assert.deepEqual(state.events, ['update:listed', 'invalidate']);
	});

	it('invalidates once, after a pending item is edited', async () => {
		seed('waiting', 'pending');
		const response = await edit('waiting', EDIT);
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['update:waiting', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed('listed', 'approved');
		state.session = null;
		const response = await edit('listed', EDIT);
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an invalid body (400)', async () => {
		seed('listed', 'approved');
		const response = await edit('listed', { name: 'x' });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when there is nothing to update (400)', async () => {
		seed('listed', 'approved');
		const response = await edit('listed', {});
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an unknown item (404)', async () => {
		const response = await edit('missing', EDIT);
		assert.equal(response.status, 404);
		assert.deepEqual(state.events, []);
	});

	it("does not invalidate for another user's item (403)", async () => {
		seed('listed', 'approved', { submitted_by: 'user-other' });
		const response = await edit('listed', EDIT);
		assert.equal(response.status, 403);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		seed('listed', 'approved');
		state.failing.add('listed');
		const response = await edit('listed', EDIT);
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('DELETE /api/client/items/[id] clears the content caches after a delete', () => {
	const remove = (id: string) => itemRoute.DELETE(jsonRequest('DELETE', `/api/client/items/${id}`), params(id));

	it('invalidates once, after the item is soft-deleted', async () => {
		seed('listed', 'approved');
		const response = await remove('listed');
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['soft-delete:listed', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed('listed', 'approved');
		state.session = null;
		const response = await remove('listed');
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an unknown item (404)', async () => {
		const response = await remove('missing');
		assert.equal(response.status, 404);
		assert.deepEqual(state.events, []);
	});

	it("does not invalidate for another user's item (403)", async () => {
		seed('listed', 'approved', { submitted_by: 'user-other' });
		const response = await remove('listed');
		assert.equal(response.status, 403);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an item that is already deleted (400)', async () => {
		seed('gone', 'approved', { deleted_at: '2026-11-27 11:00' });
		const response = await remove('gone');
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		seed('listed', 'approved');
		state.failing.add('listed');
		const response = await remove('listed');
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});

describe('POST /api/client/items/[id]/restore clears the content caches after a restore', () => {
	const restore = (id: string) =>
		restoreRoute.POST(jsonRequest('POST', `/api/client/items/${id}/restore`), params(id));

	it('invalidates once, after the item is restored', async () => {
		seed('gone', 'approved', { deleted_at: '2026-11-27 11:00' });
		const response = await restore('gone');
		assert.equal(response.status, 200);
		assert.equal(state.items.get('gone')?.deleted_at, undefined);
		assert.deepEqual(state.events, ['restore:gone', 'invalidate']);
	});

	it('does not invalidate when signed out (401)', async () => {
		seed('gone', 'approved', { deleted_at: '2026-11-27 11:00' });
		state.session = null;
		const response = await restore('gone');
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an unknown item (404)', async () => {
		const response = await restore('missing');
		assert.equal(response.status, 404);
		assert.deepEqual(state.events, []);
	});

	it("does not invalidate for another user's item (403)", async () => {
		seed('gone', 'approved', { deleted_at: '2026-11-27 11:00', submitted_by: 'user-other' });
		const response = await restore('gone');
		assert.equal(response.status, 403);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate for an item that is not deleted (400)', async () => {
		seed('listed', 'approved');
		const response = await restore('listed');
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the write fails (500)', async () => {
		seed('gone', 'approved', { deleted_at: '2026-11-27 11:00' });
		state.failing.add('gone');
		const response = await restore('gone');
		assert.equal(response.status, 500);
		assert.deepEqual(state.events, []);
	});
});
