import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level item-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/items/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-items-query.
 * spec.ts` covers the GET (paginated list) surface of the
 * same route. This spec covers the POST (create) surface
 * that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/items` is the **first** admin-tree
 * route the smoke layer covers as a **collection-level
 * create endpoint** that combines:
 *   - **five required fields** validated in a single
 *     guard expression (`!id || !name || !slug ||
 *     !description || !source_url`) returning 400 with a
 *     comma-listed message — distinct from every prior
 *     PUT smoke which validates each field separately,
 *     AND
 *   - **TWO 409 Conflict pre-create duplicate checks**
 *     (`itemRepository.checkDuplicateId(...)` and
 *     `itemRepository.checkDuplicateSlug(...)`) with
 *     **dynamically-interpolated** 409 messages
 *     (`'Item with ID '<id>' already exists'` /
 *     `'Item with slug '<slug>' already exists'`),
 *     AND
 *   - an **audit-user-threading + CRM-company-link +
 *     Location-Index side-effect chain** on the success
 *     branch.
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ success: false, error:
 *      'Unauthorized. Admin access required.' }`.
 *      Identical to the GET sibling.
 *   2. **Canonical longer 401 message** matching the
 *      canonical-longer-envelope family.
 *   3. **`success: false` envelope key** with strict
 *      envelope-shape preservation
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   4. **JSON body parse via `await request.json()`**
 *      AFTER the gate. Distinct from the
 *      `admin/sponsor-ads/[id]/approve|reject|cancel`
 *      routes which wrap the parse in a `.catch(() =>
 *      ({}))` Promise-chain catch.
 *   5. **Five-field required-validation chain** with a
 *      single guard expression and a single 400
 *      `{ success: false, error: 'Item ID, name, slug,
 *      description, and source URL are required' }`.
 *      Distinct from every prior multi-step validation
 *      chain.
 *   6. **TWO 409 Conflict pre-create duplicate checks**
 *      AFTER the required-field validation:
 *        (a) `itemRepository.checkDuplicateId(id)` →
 *            409 `'Item with ID '<id>' already exists'`
 *            (dynamically-interpolated).
 *        (b) `itemRepository.checkDuplicateSlug(slug)`
 *            → 409 `'Item with slug '<slug>' already
 *            exists'` (dynamically-interpolated).
 *      Distinct from `admin/companies/[id]` PUT which
 *      ALSO uses dynamically-interpolated 409 messages
 *      but for `domain` / `slug` and only in the PUT
 *      context.
 *   7. **Audit-user threading** —
 *      `auditUser = { id: session.user.id, name:
 *      session.user.name ?? session.user.email ??
 *      undefined }` passed to the repository.
 *   8. **`itemRepository.create(...)` call** AFTER all
 *      pre-create checks pass. Defaults `category =
 *      []`, `tags = []`, `featured = false`, `status =
 *      'draft'`. Threads `submitted_by =
 *      session.user.id`.
 *   9. **Optional CRM sync side effect** gated by
 *      `process.env.TWENTY_CRM_ENABLED === 'true'`
 *      (NOTE: strict-equals comparison, distinct from
 *      `admin/items/[id]/route.ts` PUT which uses
 *      `!== 'false'`), wrapped in its own try/catch.
 *      Walks a four-step chain
 *      (`getOrCreateCompanyFromBrand` →
 *      `linkItemToCompany` → conditional CRM sync via
 *      `upsertCompany` if newly linked).
 *  10. **Optional Location Index side effect** gated by
 *      `getLocationEnabled()`, also wrapped in its own
 *      try/catch.
 *  11. **Method-resolution surface** — the route exports
 *      `GET` and `POST`. PUT / PATCH / DELETE must
 *      round-trip to a `< 500` status (typically 405
 *      Method Not Allowed).
 *
 * Where the immediately-preceding `admin-roles-id-method.
 * spec.ts` walks the leaf-`[id]` two-step-gate-with-
 * DELETE-`?hard=true` triple-method route, this spec
 * walks the collection-level POST endpoint with the
 * five-field required validation chain, two
 * dynamically-interpolated 409 pre-create duplicate
 * checks, and the audit-user-threading + CRM + Location-
 * Index side-effect chain — a complementary surface that
 * no prior admin-tree smoke spec covers.
 */
const ITEMS_PATH = '/api/admin/items';

const ADMIN_ITEMS_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

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
	id: 'item_test_1',
	name: 'Test Item',
	slug: 'test-item',
	description: 'A test item description',
	source_url: 'https://example.com'
};

const ADMIN_ITEMS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields) if reachable)' },

	// Missing-field probes (each would 400 with the same message if reachable).
	{ data: { name: 'X', slug: 'x', description: 'd', source_url: 'https://x.com' }, label: 'no id field' },
	{ data: { id: 'i', slug: 'x', description: 'd', source_url: 'https://x.com' }, label: 'no name field' },
	{ data: { id: 'i', name: 'X', description: 'd', source_url: 'https://x.com' }, label: 'no slug field' },
	{ data: { id: 'i', name: 'X', slug: 'x', source_url: 'https://x.com' }, label: 'no description field' },
	{ data: { id: 'i', name: 'X', slug: 'x', description: 'd' }, label: 'no source_url field' },

	// Valid bodies (would proceed to duplicate checks if reachable).
	{ data: VALID_BODY, label: 'fully-valid body (would proceed to dup-id/slug/create if reachable)' },
	{
		data: { ...VALID_BODY, brand: 'Acme Inc.' },
		label: 'valid body + brand (would trigger CRM sync if reachable)'
	},
	{ data: { ...VALID_BODY, featured: true }, label: 'valid body + featured=true' },
	{ data: { ...VALID_BODY, status: 'approved' }, label: 'valid body + status=approved' },
	{ data: { ...VALID_BODY, category: ['cat1', 'cat2'] }, label: 'valid body + category array' },
	{ data: { ...VALID_BODY, tags: ['tag1', 'tag2'] }, label: 'valid body + tags array' },
	{
		data: { ...VALID_BODY, location: { lat: 40.7128, lng: -74.006 } },
		label: 'valid body + location (would trigger Location Index if reachable)'
	},

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, submitted_by: 'admin' }, label: 'fabricated submitted_by attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Item ID, name, slug, description, and source URL are required',
	'Failed to create item'
] as const;

const FORBIDDEN_409_PREFIXES = [
	/^Item with ID '/,
	/^Item with slug '/
] as const;

const FORBIDDEN_KEYS = ['data', 'item', 'id', 'slug'] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/items POST body / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_CREATE_HEADERS) {
		test(`POST ${ITEMS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(ITEMS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ITEMS_CREATE_BODIES) {
		test(`POST ${ITEMS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(ITEMS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${ITEMS_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		const response = await request.post(ITEMS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${ITEMS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(ITEMS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${ITEMS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 201 with
		// `{ success: true, data: <item> }` (the item
		// includes `id` and `slug` keys among others). The
		// unauth branch must NEVER reach the create call,
		// so the response must NOT echo `data` / `item` /
		// `id` / `slug` keys, must NOT contain
		// `success: true`, and must NOT have a 201 status.
		const response = await request.post(ITEMS_PATH, { data: VALID_BODY });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
	});

	test(`POST ${ITEMS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(ITEMS_PATH),
			request.post(ITEMS_PATH, { data: {} }),
			request.post(ITEMS_PATH, { data: VALID_BODY }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, brand: 'Acme' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// The dynamic 409 messages
			// `'Item with ID '<id>' already exists'` and
			// `'Item with slug '<slug>' already exists'`
			// are interpolated, so we use regex prefix
			// checks.
			if (typeof body.error === 'string') {
				for (const re of FORBIDDEN_409_PREFIXES) {
					expect(body.error).not.toMatch(re);
				}
			}
		}
	});

	test(`POST ${ITEMS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(ITEMS_PATH);
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: {} }),
			request.post(ITEMS_PATH, { data: VALID_BODY }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, brand: 'Acme' } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(ITEMS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(ITEMS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${ITEMS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(ITEMS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(ITEMS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(ITEMS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(ITEMS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(ITEMS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(ITEMS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(ITEMS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ITEMS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports `GET` and `POST`. Other
		// methods must round-trip to a `< 500` status.
		const responses = await Promise.all([
			request.put(ITEMS_PATH),
			request.patch(ITEMS_PATH),
			request.delete(ITEMS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ITEMS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: 'not-json' }),
			request.post(ITEMS_PATH, { data: '{ broken: json' }),
			request.post(ITEMS_PATH, { data: '{"id":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ITEMS_PATH} required-field validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, every missing-field shape
		// triggers the same 400 `'Item ID, name, slug,
		// description, and source URL are required'`
		// envelope. On the unauth branch every shape must
		// round-trip to the same 401 status as the no-body
		// baseline.
		const baseline = await request.post(ITEMS_PATH);
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: {} }),
			request.post(ITEMS_PATH, { data: { name: 'X' } }),
			request.post(ITEMS_PATH, { data: { id: 'i', name: 'X' } }),
			request.post(ITEMS_PATH, { data: { id: 'i', name: 'X', slug: 'x' } }),
			request.post(ITEMS_PATH, { data: { id: 'i', name: 'X', slug: 'x', description: 'd' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body.error).not.toBe(FORBIDDEN_MESSAGES[0]);
		}
	});

	test(`POST ${ITEMS_PATH} duplicate-id / duplicate-slug 409 branches are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, valid bodies trigger the
		// duplicate-id and duplicate-slug checks which
		// return 409 with dynamically-interpolated
		// messages. The unauth branch must NEVER match
		// the regex prefixes.
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: VALID_BODY }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, id: 'duplicate-id-probe' } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, slug: 'duplicate-slug-probe' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			if (typeof body.error === 'string') {
				for (const re of FORBIDDEN_409_PREFIXES) {
					expect(body.error).not.toMatch(re);
				}
			}
		}
	});

	test(`POST ${ITEMS_PATH} create call + audit-user threading is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `itemRepository.create(...)` before the gate
		// would surface here: the unauth response would
		// echo a `data` key with the created item. The
		// success branch returns status 201 with
		// `{ success: true, data: <item> }`.
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: VALID_BODY }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, featured: true } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, location: { lat: 40, lng: -74 } } })
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(201);
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
		}
	});

	test(`POST ${ITEMS_PATH} CRM sync side effect is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, a body with `brand` triggers
		// the four-step CRM sync chain (gated by
		// `process.env.TWENTY_CRM_ENABLED === 'true'`).
		// On the unauth branch the gate fires before any
		// of the CRM imports, so the unauth response
		// status must be the same as the no-body
		// baseline.
		const baseline = await request.post(ITEMS_PATH);
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, brand: 'Acme Inc.' } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, brand: '' } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, brand: '   ' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${ITEMS_PATH} Location Index side effect is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, a body with `location`
		// triggers the Location Index call (gated by
		// `getLocationEnabled()`). On the unauth branch
		// the gate fires before any of the index calls.
		const baseline = await request.post(ITEMS_PATH);
		const responses = await Promise.all([
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, location: { lat: 40.7128, lng: -74.006 } } }),
			request.post(ITEMS_PATH, { data: { ...VALID_BODY, location: null } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
