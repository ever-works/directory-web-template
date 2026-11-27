import assert from 'node:assert/strict';
import Module from 'node:module';
import { beforeEach, describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `POST /api/admin/items/import` wrote the imported rows to the data repository and cleared no
 * cache. `fetchItems` (`lib/content.ts`) keeps the public listing in memory for 10 minutes
 * whenever NODE_ENV is not development, and the listing pages, `GET /api/items/listing` and
 * `GET /api/items/engagement` read it. So after an admin imported rows as approved, or used the
 * update strategy on approved items, the listing left out the new items or showed the old text
 * for up to 10 minutes. The route now calls `invalidateContentCaches()` once after the import,
 * when it created or updated at least one item, as the admin item routes do (T-2865) (T-2872).
 *
 * The real route and the real `ItemImportService` are loaded with `next/server`, the admin guard,
 * the item repository and `lib/cache-invalidation` replaced. The repository stub records each
 * batch write in `events`, as the cache stub records each `invalidateContentCaches()` call, so a
 * test reads the order of the two. The module graph is CommonJS under `tsx --test`, so
 * intercepting `Module._load` is enough.
 */
type Handler = (request: Request) => Promise<Response>;
type StoredItem = { id: string; slug: string; name: string; source_url: string; status: string };
type ImportResult = { total: number; created: number; updated: number; skipped: number; errors: unknown[] };

const ADMIN_SESSION = { user: { id: 'admin-1', name: 'Admin', email: 'admin@example.com' } };

const state = {
	session: ADMIN_SESSION as typeof ADMIN_SESSION | null,
	items: new Map<string, StoredItem>(),
	/** Batch writes that throw, as a failed file write or git operation does. */
	failing: new Set<'create' | 'update'>(),
	/** Each batch write (`create:<slugs>`, `update:<ids>`) and each cache invalidation, in order. */
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

class StubItemRepository {
	async findAll() {
		return [...state.items.values()];
	}
	async batchCreate(items: StoredItem[]) {
		if (state.failing.has('create')) throw new Error('Git operation failed');
		state.events.push(`create:${items.map((item) => item.slug).join(',')}`);
		for (const item of items) state.items.set(item.id, item);
		return items;
	}
	async batchUpdate(updates: Array<{ id: string; data: Partial<StoredItem> }>) {
		if (state.failing.has('update')) throw new Error('Git operation failed');
		state.events.push(`update:${updates.map((update) => update.id).join(',')}`);
		return updates.map(({ id, data }) => {
			const updated = { ...(state.items.get(id) as StoredItem), ...data, id };
			state.items.set(id, updated);
			return updated;
		});
	}
}

const stubs: Record<string, unknown> = {
	'server-only': {},
	'next/server': { NextResponse: StubNextResponse, NextRequest: Request },
	'@/lib/auth/admin-guard': {
		requireAdminSession: async () => {
			if (!state.session) return StubNextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
			return { session: state.session };
		}
	},
	'@/lib/repositories/item.repository': { ItemRepository: StubItemRepository },
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
const importRoute = require('../../app/api/admin/items/import/route') as { POST: Handler };
loader._load = originalLoad;

/** A row as the browser sends it back from the validate step. */
const row = (rowIndex: number, slug: string, name = `Item ${slug}`) => ({
	rowIndex,
	valid: true,
	errors: [],
	warnings: [],
	data: {
		name,
		slug,
		description: `Imported item ${slug} for the directory`,
		source_url: `https://example.com/${slug}`,
		category: ['productivity'],
		tags: [],
		collections: [],
		featured: false,
		images: []
	}
});

const runImport = (payload: unknown) =>
	importRoute.POST(
		new Request(new URL('/api/admin/items/import', 'http://localhost'), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		})
	);
const resultOf = async (response: Response) => ((await response.json()) as { result: ImportResult }).result;

function seed(...slugs: string[]) {
	for (const slug of slugs) {
		state.items.set(slug, {
			id: slug,
			slug,
			name: `Item ${slug}`,
			source_url: `https://example.com/${slug}`,
			status: 'approved'
		});
	}
}

beforeEach(() => {
	state.session = ADMIN_SESSION;
	state.items.clear();
	state.failing.clear();
	state.events = [];
});

describe('POST /api/admin/items/import clears the content caches after an import that wrote items', () => {
	it('invalidates once, after the approved rows are created', async () => {
		const response = await runImport({
			rows: [row(0, 'first'), row(1, 'second')],
			options: { duplicateStrategy: 'skip', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		assert.equal((await resultOf(response)).created, 2);
		assert.deepEqual(state.events, ['create:first,second', 'invalidate']);
	});

	it('invalidates once, after the update strategy rewrites an existing item', async () => {
		seed('listed');
		const response = await runImport({
			rows: [row(0, 'listed', 'Listed, renamed')],
			options: { duplicateStrategy: 'update', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		assert.equal((await resultOf(response)).updated, 1);
		assert.deepEqual(state.events, ['update:listed', 'invalidate']);
	});

	it('invalidates once for an import that both creates and updates', async () => {
		seed('listed');
		const response = await runImport({
			rows: [row(0, 'fresh'), row(1, 'listed', 'Listed, renamed')],
			options: { duplicateStrategy: 'update', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		assert.deepEqual(state.events, ['create:fresh', 'update:listed', 'invalidate']);
	});

	it('invalidates once when the creates fail but the updates are written', async () => {
		seed('listed');
		state.failing.add('create');
		const response = await runImport({
			rows: [row(0, 'fresh'), row(1, 'listed', 'Listed, renamed')],
			options: { duplicateStrategy: 'update', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		const result = await resultOf(response);
		assert.equal(result.created, 0);
		assert.equal(result.updated, 1);
		assert.deepEqual(state.events, ['update:listed', 'invalidate']);
	});

	it('does not invalidate when every row is skipped as a duplicate', async () => {
		seed('listed');
		const response = await runImport({
			rows: [row(0, 'listed')],
			options: { duplicateStrategy: 'skip', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		assert.equal((await resultOf(response)).skipped, 1);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when every row is invalid', async () => {
		const response = await runImport({
			rows: [{ ...row(0, 'bad'), valid: false, errors: ['name: Required'] }],
			options: { duplicateStrategy: 'skip', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		assert.equal((await resultOf(response)).created, 0);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the batch write fails', async () => {
		state.failing.add('create');
		const response = await runImport({
			rows: [row(0, 'fresh')],
			options: { duplicateStrategy: 'skip', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 200);
		const result = await resultOf(response);
		assert.equal(result.created, 0);
		assert.equal(result.errors.length, 1);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when signed out (401)', async () => {
		state.session = null;
		const response = await runImport({
			rows: [row(0, 'fresh')],
			options: { duplicateStrategy: 'skip', defaultStatus: 'approved' }
		});
		assert.equal(response.status, 401);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the rows are missing (400)', async () => {
		const response = await runImport({ options: { duplicateStrategy: 'skip', defaultStatus: 'approved' } });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});

	it('does not invalidate when the options are missing (400)', async () => {
		const response = await runImport({ rows: [row(0, 'fresh')] });
		assert.equal(response.status, 400);
		assert.deepEqual(state.events, []);
	});
});
