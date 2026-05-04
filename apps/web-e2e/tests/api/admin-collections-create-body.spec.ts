import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level collection-create
 * endpoint served by the `POST` export of
 * `apps/web/app/api/admin/collections/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-collections-
 * query.spec.ts` covers the GET (paginated list) surface
 * of the same route. This spec covers the POST (create)
 * surface that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/collections` is the **first** admin-tree
 * POST route the smoke layer covers that combines:
 *
 *   - **Canonical longer 401 envelope** `{ success: false,
 *     error: 'Unauthorized. Admin access required.' }` —
 *     matching `admin/categories` POST and the GET / PUT /
 *     DELETE handlers under `admin/collections/[id]/route.ts`.
 *   - A **per-call inline `try { body = await request.
 *     json() } catch (jsonError) { ... }`** wrapper that
 *     emits a **`'Invalid JSON in request body'` 400
 *     envelope** — the FIRST collection-level admin POST
 *     route the smoke layer covers that wraps the
 *     `request.json()` call in its own try/catch. Every
 *     prior collection-level POST smoke
 *     (`admin/items`, `admin/users`, `admin/categories`,
 *     `admin/tags`, `admin/companies`, `admin/clients`)
 *     uses the bare `await request.json()` form.
 *   - A **manual TWO-field required check**
 *     `if (!createData.id || !createData.name)` → 400
 *     `{ success: false, error: 'Collection ID and name
 *     are required' }`. Distinct from
 *     `admin/categories` POST single-field check (only
 *     `name`) and from `admin/tags` POST two-field check
 *     (different fields).
 *   - A **`collection` success-payload key** (NOT `data`)
 *     — matching the `category` key used by
 *     `admin/categories` POST. Distinct from every prior
 *     admin POST smoke that uses `data`.
 *   - A **two-`revalidatePath` cache-invalidation chain**
 *     on the success branch — `revalidatePath('/collections')`
 *     PLUS `revalidatePath(\`/collections/\${slug}\`)`
 *     (slug-aware), in addition to
 *     `await invalidateContentCaches()`. The unauth
 *     branch must NEVER enter that side-effect.
 *   - A **three-branch outer catch chain**:
 *       (a) `error.message.includes('already exists')`
 *           → 409 echoing raw `error.message`.
 *       (b) `error.message.includes('must')` → 400
 *           echoing raw `error.message`.
 *       (c) `safeErrorResponse(error, 'Failed to create
 *           collection')` fallback.
 *     Identical in shape to the `admin/categories` POST
 *     three-branch outer catch (`'already exists'` /
 *     `'must be'` / `safeErrorResponse(...)`).
 *
 * The smoke layer pins the family of unauth-branch
 * invariants:
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 canonical longer envelope.
 *   2. **Per-call try/catch JSON parse AFTER the gate** —
 *      the JSON parse must NEVER run on the unauth
 *      branch, so the `'Invalid JSON in request body'`
 *      400 envelope must NEVER appear.
 *   3. **Manual TWO-field required check AFTER the JSON
 *      parse** — the `'Collection ID and name are
 *      required'` 400 envelope must NEVER appear on the
 *      unauth branch.
 *   4. **`collectionRepository.create(...)` call AFTER
 *      the required-field check** — the unauth branch
 *      must NEVER trigger the create call (status 201
 *      with the `collection` key must NEVER appear).
 *   5. **`await invalidateContentCaches()` plus TWO
 *      `revalidatePath` calls** AFTER the create call —
 *      the unauth branch must NEVER enter that side-
 *      effect (no cache invalidation, no revalidation).
 *   6. **Three-branch outer catch chain** — none of
 *      `'already exists'` / `'must'` / `'Failed to create
 *      collection'` may appear on the unauth branch.
 *   7. **Method-resolution surface** — the route exports
 *      `GET` and `POST`. PUT / PATCH / DELETE must
 *      round-trip to a `< 500` status (typically 405
 *      Method Not Allowed).
 *
 * Where the immediately-preceding `admin-companies-
 * create-body.spec.ts` walks the bare-envelope POST
 * with a Zod-`parse()`-with-`details`-envelope
 * validation chain and TWO 409 pre-create uniqueness
 * checks, this spec walks the canonical-longer-envelope
 * POST with a per-call `request.json()` try/catch +
 * manual two-field required check + two-`revalidatePath`
 * cache-invalidation chain — a complementary surface
 * that no prior admin-tree smoke spec covers.
 */
const COLLECTIONS_PATH = '/api/admin/collections';

const ADMIN_COLLECTIONS_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const VALID_BODY = {
	id: 'productivity-tools',
	name: 'Productivity Tools',
	slug: 'productivity-tools',
	description: 'Essential tools to boost your productivity',
	icon_url: '/icons/productivity.svg',
	isActive: true
} as const;

const ADMIN_COLLECTIONS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-id-and-name) if reachable)' },

	// Required-field probes — both id and name are required.
	{ data: { id: 'productivity-tools' }, label: 'id-only body (would 400 (req-id-and-name) if reachable)' },
	{ data: { name: 'Productivity Tools' }, label: 'name-only body (would 400 (req-id-and-name) if reachable)' },
	{ data: { id: '', name: 'Test' }, label: 'empty id (would 400 if reachable)' },
	{ data: { id: 'test', name: '' }, label: 'empty name (would 400 if reachable)' },
	{ data: { id: null, name: 'Test' }, label: 'null id (would 400 if reachable)' },
	{ data: { id: 'test', name: null }, label: 'null name (would 400 if reachable)' },

	// Valid bodies (would create collection if reachable).
	{ data: VALID_BODY, label: 'fully-valid body' },
	{ data: { id: 'minimal', name: 'Minimal' }, label: 'valid id+name minimal body' },
	{ data: { ...VALID_BODY, isActive: false }, label: 'valid + isActive=false body' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Invalid JSON in request body',
	'Collection ID and name are required',
	'Failed to create collection',
	'Collection created successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'collection', 'message'] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';
const BARE_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/collections POST body / header surface', () => {
	for (const { headers, label } of ADMIN_COLLECTIONS_CREATE_HEADERS) {
		test(`POST ${COLLECTIONS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(COLLECTIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_COLLECTIONS_CREATE_BODIES) {
		test(`POST ${COLLECTIONS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(COLLECTIONS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${COLLECTIONS_PATH} returns 401 with the canonical longer Unauthorized envelope (NOT bare)`, async ({
		request
	}) => {
		const response = await request.post(COLLECTIONS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(body.error).not.toBe(BARE_401_MESSAGE);
	});

	test(`POST ${COLLECTIONS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(COLLECTIONS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`POST ${COLLECTIONS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch: status 201 with `{ success: true,
		// collection: <collection>, message: 'Collection
		// created successfully' }` (NOTE: `collection` key,
		// NOT `data`). The unauth branch must NEVER reach
		// the create call.
		const response = await request.post(COLLECTIONS_PATH, { data: VALID_BODY });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
	});

	test(`POST ${COLLECTIONS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH),
			request.post(COLLECTIONS_PATH, { data: {} }),
			request.post(COLLECTIONS_PATH, { data: { id: 'test' } }),
			request.post(COLLECTIONS_PATH, { data: { name: 'Test' } }),
			request.post(COLLECTIONS_PATH, { data: VALID_BODY }),
			request.post(COLLECTIONS_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${COLLECTIONS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(COLLECTIONS_PATH);
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH, { data: {} }),
			request.post(COLLECTIONS_PATH, { data: VALID_BODY }),
			request.post(COLLECTIONS_PATH, { data: { id: 'minimal', name: 'Minimal' } }),
			request.post(COLLECTIONS_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(COLLECTIONS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${COLLECTIONS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(COLLECTIONS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(COLLECTIONS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(COLLECTIONS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COLLECTIONS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(COLLECTIONS_PATH),
			request.patch(COLLECTIONS_PATH),
			request.delete(COLLECTIONS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${COLLECTIONS_PATH} per-call request.json try/catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the inline try/catch around
		// `await request.json()` emits a 400 envelope
		// `{ success: false, error: 'Invalid JSON in
		// request body' }` for malformed bodies. The unauth
		// branch must NEVER reach this catch — the gate
		// fires BEFORE the JSON parse.
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH, { data: 'not-json' }),
			request.post(COLLECTIONS_PATH, { data: '{ broken: json' }),
			request.post(COLLECTIONS_PATH, { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
			const body = await response.json();
			expect(body.error).not.toBe('Invalid JSON in request body');
		}
	});

	test(`POST ${COLLECTIONS_PATH} required-field check is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, the manual two-field required
		// check `if (!createData.id || !createData.name)`
		// emits a 400 envelope `{ success: false, error:
		// 'Collection ID and name are required' }`. The
		// unauth branch must NEVER reach this check.
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH, { data: {} }),
			request.post(COLLECTIONS_PATH, { data: { id: 'test' } }),
			request.post(COLLECTIONS_PATH, { data: { name: 'Test' } }),
			request.post(COLLECTIONS_PATH, { data: { id: '', name: 'Test' } }),
			request.post(COLLECTIONS_PATH, { data: { id: 'test', name: '' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Collection ID and name are required');
		}
	});

	test(`POST ${COLLECTIONS_PATH} create call + cache invalidation are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the success branch returns
		// status 201 with the `collection` key plus a
		// `message: 'Collection created successfully'`
		// payload — and triggers
		// `await invalidateContentCaches()` PLUS TWO
		// `revalidatePath` calls (`/collections` and
		// `/collections/${slug}`). The unauth branch must
		// NEVER reach the create call or any of the cache
		// invalidation side-effects.
		const responses = await Promise.all([
			request.post(COLLECTIONS_PATH, { data: VALID_BODY }),
			request.post(COLLECTIONS_PATH, { data: { id: 'minimal', name: 'Minimal' } })
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(201);
			const body = await response.json();
			expect(body.collection).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).not.toBe('Collection created successfully');
		}
	});

	test(`POST ${COLLECTIONS_PATH} three-branch outer catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the outer catch maps
		// `'already exists'` → 409 and `'must'` → 400
		// (echoing raw error.message), with
		// `safeErrorResponse(...)` fallback emitting
		// `'Failed to create collection'`. The unauth
		// branch must NEVER reach this catch chain — it
		// must echo the canonical 401 envelope instead.
		const response = await request.post(COLLECTIONS_PATH, {
			data: { id: 'duplicate-probe', name: 'Duplicate Probe' }
		});
		const body = await response.json();
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
		expect(body.error).not.toBe('Failed to create collection');
	});
});
