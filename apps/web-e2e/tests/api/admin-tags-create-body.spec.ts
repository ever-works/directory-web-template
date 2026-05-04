import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level tag-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/tags/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-tags-query.
 * spec.ts` covers the GET (paginated list) surface of
 * the same route. This spec covers the POST (create)
 * surface that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/tags` is the **first** admin-tree
 * route the smoke layer covers as a **collection-level
 * create endpoint** that combines the **hybrid
 * bare-`Unauthorized` + `success: false` 401 envelope**
 * (matching the `admin/tags/[id]` GET/PUT/DELETE smoke,
 * `admin/users/[id]`, `admin/featured-items/[id]`,
 * `admin/roles/[id]/permissions`) with a **`tag`
 * success-payload key** (NOT `data`) — distinct from
 * the canonical-longer-envelope `admin/categories` and
 * `admin/collections` POST smokes (which also use single-
 * resource success-keys but with the canonical longer
 * 401 envelope).
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401
 *      `{ success: false, error: 'Unauthorized' }`
 *      (the bare-`Unauthorized` message PLUS `success:
 *      false` envelope key — distinct from the
 *      canonical-longer-envelope of `admin/categories`
 *      POST and from the no-`success`-key envelope of
 *      `admin/clients/[clientId]`).
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the gate. NOT wrapped in a per-call
 *      try/catch.
 *   3. **Two-field required check** — `if (!id ||
 *      !name)` → 400 `'Tag ID and name are required'`.
 *      Distinct from the single-field `admin/categories`
 *      POST and from the multi-field chains of
 *      `admin/items` (5 fields) and `admin/users`
 *      (8-step chain).
 *   4. **`tagRepository.create({ id, name, isActive:
 *      isActive ?? true })` call** — defaults
 *      `isActive` to `true` if not provided. Distinct
 *      from prior POST smokes that don't default a
 *      boolean field.
 *   5. **`await invalidateContentCaches()`** side
 *      effect on the success branch.
 *   6. **Three-branch outer catch chain** (matching
 *      `admin/tags/[id]` PUT):
 *        (a) `error.message.includes('already exists')`
 *            → 409 echoing raw `error.message`.
 *        (b) `error.message.includes('required' \| 'must
 *            be')` → 400 echoing raw `error.message`.
 *        (c) Else: 500 `'Failed to create tag'` (NOTE:
 *            this is a fixed-message fallback NOT
 *            `safeErrorResponse(...)` — distinct from
 *            the `admin/categories` POST which uses
 *            `safeErrorResponse(...)` as the fallback).
 *   7. **Success payload** with **`tag` success-key
 *      (NOT `data`)** — `{ success: true, tag: <tag> }`
 *      with status 201. NOTE: NO `message` key —
 *      distinct from `admin/categories` POST (which
 *      includes `message: 'Category created
 *      successfully'`) and `admin/collections` POST
 *      (which includes `message: 'Collection created
 *      successfully'`).
 *   8. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-categories-
 * create-body.spec.ts` walks the canonical-longer-
 * envelope `POST /api/admin/categories` collection-
 * level endpoint with a single-field required check
 * and `safeErrorResponse(...)` fallback, this spec
 * walks the bare-message + `success: false` envelope
 * `POST /api/admin/tags` collection-level endpoint
 * with a two-field required check, a fixed-message
 * 500 fallback (NOT `safeErrorResponse(...)`), and
 * the `tag` success-key with NO `message` field — a
 * complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const TAGS_PATH = '/api/admin/tags';

const ADMIN_TAGS_CREATE_HEADERS = [
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

const ADMIN_TAGS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-id-name) if reachable)' },

	// Two-field required-check probes.
	{ data: { id: 'i' }, label: 'id-only body (would 400 (req-name) if reachable)' },
	{ data: { name: 'X' }, label: 'name-only body (would 400 (req-id) if reachable)' },
	{ data: { id: '', name: 'X' }, label: 'empty id (would 400 (req-id) if reachable)' },
	{ data: { id: 'i', name: '' }, label: 'empty name (would 400 (req-name) if reachable)' },

	// Valid bodies (would create tag if reachable).
	{ data: { id: 'productivity', name: 'Productivity' }, label: 'valid id+name body' },
	{ data: { id: 'i', name: 'X', isActive: true }, label: 'valid + isActive=true' },
	{ data: { id: 'i', name: 'X', isActive: false }, label: 'valid + isActive=false' },

	// Bypass attempts.
	{ data: { isAdmin: true, id: 'i', name: 'X' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', id: 'i', name: 'X' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), id: 'i', name: 'X' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tag ID and name are required',
	'Failed to create tag'
] as const;

const FORBIDDEN_KEYS = ['data', 'tag'] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/tags POST body / header surface', () => {
	for (const { headers, label } of ADMIN_TAGS_CREATE_HEADERS) {
		test(`POST ${TAGS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(TAGS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_TAGS_CREATE_BODIES) {
		test(`POST ${TAGS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(TAGS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${TAGS_PATH} returns 401 with the hybrid bare-message + success: false envelope`, async ({ request }) => {
		const response = await request.post(TAGS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`POST ${TAGS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(TAGS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${TAGS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 201 with `{ success:
		// true, tag: <tag> }` (NOTE: `tag` key, NOT
		// `data`; NO `message` key). The unauth branch
		// must NEVER reach the create call.
		const response = await request.post(TAGS_PATH, { data: { id: 'i', name: 'X' } });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
	});

	test(`POST ${TAGS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TAGS_PATH),
			request.post(TAGS_PATH, { data: {} }),
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${TAGS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(TAGS_PATH);
		const responses = await Promise.all([
			request.post(TAGS_PATH, { data: {} }),
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X' } }),
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X', isActive: false } }),
			request.post(TAGS_PATH, { data: { isAdmin: true, id: 'i', name: 'X' } }),
			request.post(TAGS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(TAGS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${TAGS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TAGS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(TAGS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(TAGS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(TAGS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(TAGS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(TAGS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(TAGS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(TAGS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TAGS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(TAGS_PATH),
			request.patch(TAGS_PATH),
			request.delete(TAGS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TAGS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TAGS_PATH, { data: 'not-json' }),
			request.post(TAGS_PATH, { data: '{ broken: json' }),
			request.post(TAGS_PATH, { data: '{"id":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TAGS_PATH} required-field check is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TAGS_PATH, { data: {} }),
			request.post(TAGS_PATH, { data: { id: 'i' } }),
			request.post(TAGS_PATH, { data: { name: 'X' } }),
			request.post(TAGS_PATH, { data: { id: '', name: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Tag ID and name are required');
		}
	});

	test(`POST ${TAGS_PATH} create call + cache invalidation are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, success branch returns
		// status 201 with the `tag` key. The unauth
		// branch must NEVER reach the create call or the
		// cache invalidation.
		const responses = await Promise.all([
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X' } }),
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X', isActive: true } }),
			request.post(TAGS_PATH, { data: { id: 'i', name: 'X', isActive: false } })
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(201);
			const body = await response.json();
			expect(body.tag).toBeUndefined();
			expect(body.success).not.toBe(true);
		}
	});

	test(`POST ${TAGS_PATH} three-branch outer catch is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, the outer catch maps
		// `'already exists'` → 409 and `'required' \| 'must
		// be'` → 400 (echoing raw error.message), with a
		// FIXED-message 500 `'Failed to create tag'`
		// fallback (NOT safeErrorResponse). The unauth
		// branch must NEVER reach this catch chain.
		const response = await request.post(TAGS_PATH, { data: { id: 'duplicate-probe', name: 'Duplicate' } });
		const body = await response.json();
		expect(body.error).toBe(HYBRID_401_MESSAGE);
		expect(body.error).not.toBe('Failed to create tag');
	});
});
