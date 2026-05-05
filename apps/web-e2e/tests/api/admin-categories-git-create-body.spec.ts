import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only Git-based category-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/categories/git/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-categories-
 * git-query.spec.ts` covers the GET surface of the same
 * route. This spec covers the POST (Git-create) surface
 * that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/categories/git` is the **first POST-
 * only Git-CMS-write admin-tree smoke** the docs tree
 * publishes — distinct from the regular `admin/
 * categories` POST which writes to the DB. The Git POST
 * commits a new category file to the configured
 * `DATA_REPOSITORY` GitHub repository via
 * `createCategoryGitService`.
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ error: 'Unauthorized. Admin
 *      access required.' }` — NOTE: **canonical longer
 *      message but WITHOUT `success: false` envelope
 *      key**. This is a UNIQUE envelope shape: the only
 *      prior route with the canonical longer message
 *      uses `success: false` (`admin/items/[id]`,
 *      `admin/categories/[id]`, `admin/items/import`,
 *      etc.); the only prior route that uses the bare
 *      `{ error: ... }` envelope (no `success` key)
 *      uses the SHORT `'Unauthorized'` message
 *      (`admin/clients/[clientId]`, `admin/companies/
 *      [id]`, `admin/companies` POST). This route
 *      mixes the canonical longer message WITH the
 *      bare envelope.
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the gate. NOT wrapped in a per-call
 *      try/catch.
 *   3. **Two-field required check** — `if (!id ||
 *      !name)` → 400 `{ success: false, error:
 *      'Category ID and name are required' }` (NOTE:
 *      includes `success: false` key — distinct from
 *      the 401 envelope which lacks it).
 *   4. **DATA_REPOSITORY env-var validation** —
 *      `process.env.DATA_REPOSITORY` → 500
 *      `'DATA_REPOSITORY not configured. Please set
 *      DATA_REPOSITORY environment variable.'` if
 *      missing.
 *   5. **DATA_REPOSITORY URL format check** — must
 *      match `/https:\/\/github\.com\/([^\/]+)\/([^\/]+)
 *      /` regex → 500 `'Invalid DATA_REPOSITORY format.
 *      Expected: https://github.com/owner/repo'` if
 *      malformed.
 *   6. **GH_TOKEN env-var validation** — `if
 *      (!gitConfig.token)` → 500 `'GitHub token not
 *      configured. Please set GH_TOKEN environment
 *      variable.'` if missing.
 *   7. **`createCategoryGitService(gitConfig).
 *      createCategory({ id, name })`** — the load-
 *      bearing Git-service call. Distinct from prior
 *      POST smokes which use database repositories.
 *   8. **Success payload** — `{ success: true,
 *      category: <newCategory>, message: 'Category
 *      created and committed to Git repository' }`
 *      with status 200 (NOT 201).
 *   9. **Outer catch with two branches**:
 *        (a) `error.message.includes('already exists')`
 *            → 409 echoing raw `error.message`.
 *        (b) Else: `safeErrorResponse(error, 'Failed
 *            to create category via Git')`.
 *  10. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-featured-
 * items-create-body.spec.ts` walks a Q-010b tenant-
 * only-gated POST, this spec walks a properly-admin-
 * gated POST with a unique mixed-envelope shape and
 * a Git-service-based create — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const CATEGORIES_GIT_PATH = '/api/admin/categories/git';

const ADMIN_CATEGORIES_GIT_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_CATEGORIES_GIT_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields) if reachable)' },

	// Required-field probes.
	{ data: { name: 'X' }, label: 'no id field (would 400 (req-fields) if reachable)' },
	{ data: { id: 'i' }, label: 'no name field (would 400 (req-fields) if reachable)' },
	{ data: { id: '', name: 'X' }, label: 'empty id (would 400 (req-fields) if reachable)' },
	{ data: { id: 'i', name: '' }, label: 'empty name (would 400 (req-fields) if reachable)' },

	// Valid bodies (would commit to Git if reachable).
	{ data: { id: 'productivity', name: 'Productivity' }, label: 'valid id+name body' },
	{ data: { id: 'business', name: 'Business Tools' }, label: 'valid body alternate' },

	// Bypass attempts.
	{ data: { isAdmin: true, id: 'i', name: 'X' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', id: 'i', name: 'X' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), id: 'i', name: 'X' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Category ID and name are required',
	'DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable.',
	'Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo',
	'GitHub token not configured. Please set GH_TOKEN environment variable.',
	'Failed to create category via Git',
	'Category created and committed to Git repository'
] as const;

const FORBIDDEN_KEYS = ['data', 'category', 'success'] as const;

const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/categories/git POST body / header surface', () => {
	for (const { headers, label } of ADMIN_CATEGORIES_GIT_CREATE_HEADERS) {
		test(`POST ${CATEGORIES_GIT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CATEGORIES_GIT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_CATEGORIES_GIT_CREATE_BODIES) {
		test(`POST ${CATEGORIES_GIT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CATEGORIES_GIT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CATEGORIES_GIT_PATH} returns 401 with the canonical longer message in a bare envelope (NO success key)`, async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-
		// bearing invariant: the gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 401 with the bare envelope `{ error:
		// 'Unauthorized. Admin access required.' }` —
		// NOTE: NO `success: false` key. This is a UNIQUE
		// envelope shape that mixes the canonical longer
		// message with the bare envelope.
		const response = await request.post(CATEGORIES_GIT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: CANONICAL_LONGER_401_MESSAGE });
	});

	test(`POST ${CATEGORIES_GIT_PATH} unauth envelope has NO success key`, async ({ request }) => {
		// Strict envelope-shape assertion: the bare
		// envelope is `{ error: 'Unauthorized. Admin
		// access required.' }`. The ABSENCE of a `success`
		// key is the cross-route divergence that
		// distinguishes this route's gate from the
		// canonical-longer-envelope-with-`success: false`
		// family of `admin/items/[id]`, `admin/categories/
		// [id]`, etc.
		const response = await request.post(CATEGORIES_GIT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${CATEGORIES_GIT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// category: <newCategory>, message: 'Category
		// created and committed to Git repository' }`
		// with status 200. The unauth branch must NEVER
		// reach the Git service.
		const response = await request.post(CATEGORIES_GIT_PATH, { data: { id: 'i', name: 'X' } });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.message).toBeUndefined();
	});

	test(`POST ${CATEGORIES_GIT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_GIT_PATH),
			request.post(CATEGORIES_GIT_PATH, { data: {} }),
			request.post(CATEGORIES_GIT_PATH, { data: { id: 'i', name: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(CATEGORIES_GIT_PATH);
		const responses = await Promise.all([
			request.post(CATEGORIES_GIT_PATH, { data: {} }),
			request.post(CATEGORIES_GIT_PATH, { data: { id: 'i', name: 'X' } }),
			request.post(CATEGORIES_GIT_PATH, { data: { isAdmin: true, id: 'i', name: 'X' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_GIT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(CATEGORIES_GIT_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(CATEGORIES_GIT_PATH),
			request.patch(CATEGORIES_GIT_PATH),
			request.delete(CATEGORIES_GIT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_GIT_PATH, { data: 'not-json' }),
			request.post(CATEGORIES_GIT_PATH, { data: '{ broken: json' }),
			request.post(CATEGORIES_GIT_PATH, { data: '{"id":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} required-field check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_GIT_PATH, { data: {} }),
			request.post(CATEGORIES_GIT_PATH, { data: { id: 'i' } }),
			request.post(CATEGORIES_GIT_PATH, { data: { name: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Category ID and name are required');
		}
	});

	test(`POST ${CATEGORIES_GIT_PATH} env-var validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch with valid body, the env-var
		// validation chain runs (DATA_REPOSITORY missing
		// → 500, DATA_REPOSITORY format → 500, GH_TOKEN
		// missing → 500). The unauth branch must NEVER
		// reach this chain.
		const response = await request.post(CATEGORIES_GIT_PATH, { data: { id: 'i', name: 'X' } });
		const body = await response.json();
		expect(body.error).not.toBe('DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable.');
		expect(body.error).not.toBe('Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo');
		expect(body.error).not.toBe('GitHub token not configured. Please set GH_TOKEN environment variable.');
	});

	test(`POST ${CATEGORIES_GIT_PATH} Git service call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders
		// `createCategoryGitService(...).createCategory(...)`
		// before the gate would surface here: the unauth
		// response would echo a `category` key from the
		// Git-committed payload.
		const response = await request.post(CATEGORIES_GIT_PATH, {
			data: { id: 'productivity', name: 'Productivity' }
		});
		const body = await response.json();
		expect(body.category).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
	});
});
