import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the **non-admin-gated** collection-level featured-
 * items-create endpoint served by the `POST` export of
 * `apps/web/app/api/admin/featured-items/route.ts`.
 *
 * `POST /api/admin/featured-items` is the **seventh
 * Q-010b-style auth-gate-divergence finding** the smoke
 * layer documents — the route's POST handler **does NOT
 * call `!isAdmin` at any point**. It DOES require an
 * authenticated user (`!session?.user?.id` → 401) and
 * a tenant (`!tenantId` → 403), so the route is tenant-
 * scoped to authenticated users but is effectively non-
 * admin-restricted.
 *
 * Distinct from the sibling `admin/notifications` POST
 * (the sixth Q-010b finding), the featured-items POST
 * runs `getTenantId()` BEFORE the body parse — a
 * "tenant-first" two-step gate ordering. The
 * `admin/notifications` POST INTERLEAVES tenant
 * resolution with body validation. The featured-items
 * leaf-`[id]` route covered by
 * `admin-featured-items-id-method-spec.md` uses the
 * same two-step gate but on each of GET / PUT / DELETE.
 *
 *   1. **Two-step gate** —
 *        (a) `!session?.user?.id` → 401
 *            `{ success: false, error: 'Unauthorized' }`.
 *        (b) `!tenantId` (after `getTenantId()` BEFORE
 *            body parse) → 403 `{ success: false,
 *            error: 'Tenant not found' }`. Distinct
 *            from `admin/notifications` POST which
 *            runs `getTenantId()` AFTER body parse.
 *   2. **Hybrid bare-`Unauthorized` + `success: false`
 *      envelope**.
 *   3. **JSON body parse via `await request.json()`**
 *      AFTER both gate steps. NOT wrapped in a per-
 *      call try/catch.
 *   4. **Two-field required check** — `if (!itemSlug
 *      || !itemName)` → 400 `'Item slug and name are
 *      required'`.
 *   5. **Already-featured-check** — inline Drizzle
 *      `select()` from `featuredItems` with `eq(
 *      itemSlug)` + `eq(isActive, true)` + tenant
 *      scoping → 400 `'Item is already featured'` if
 *      `result.length > 0`. The first POST smoke that
 *      uses a 400 (NOT 409) for an already-exists
 *      check.
 *   6. **Inline Drizzle insert** with `featuredItems`
 *      schema; `featuredUntil` parsed as `new Date()`
 *      if provided; `featuredBy = session.user.id`;
 *      `tenantId` from `getTenantId()`; `featuredOrder`
 *      defaults to `0` via destructure default.
 *   7. **Success payload** — `{ success: true, data:
 *      <featuredItem>, message: 'Item featured
 *      successfully' }` with status 200.
 *   8. **`console.error` + 500 `'Failed to create
 *      featured item'` catch** — distinct from the
 *      `admin/notifications` POST catch (`'Internal
 *      server error'`).
 *   9. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-notifications-
 * create-body.spec.ts` walks the **interleaved** two-
 * step-gate POST, this spec walks the **tenant-first**
 * two-step-gate POST with an already-featured 400
 * check — a complementary surface that no prior admin-
 * tree smoke spec covers.
 */
const FEATURED_ITEMS_PATH = '/api/admin/featured-items';

const ADMIN_FEATURED_ITEMS_CREATE_HEADERS = [
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
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const VALID_BODY = {
	itemSlug: 'awesome-tool',
	itemName: 'Awesome Tool'
};

const ADMIN_FEATURED_ITEMS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields) if reachable)' },

	// Required-field probes.
	{ data: { itemName: 'X' }, label: 'no itemSlug field (would 400 (req-fields) if reachable)' },
	{ data: { itemSlug: 'x' }, label: 'no itemName field (would 400 (req-fields) if reachable)' },

	// Valid bodies.
	{ data: VALID_BODY, label: 'fully-valid body' },
	{
		data: {
			...VALID_BODY,
			itemIconUrl: 'https://example.com/icon.png',
			itemCategory: 'Productivity',
			itemDescription: 'A great tool',
			featuredOrder: 10
		},
		label: 'fully-populated body'
	},
	{ data: { ...VALID_BODY, featuredUntil: '2025-12-31T23:59:59.000Z' }, label: 'with valid futureUntil ISO date' },
	{ data: { ...VALID_BODY, featuredUntil: null }, label: 'with null featuredUntil' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, featuredBy: 'attacker' }, label: 'fabricated featuredBy attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tenant not found',
	'Item slug and name are required',
	'Item is already featured',
	'Failed to create featured item',
	'Item featured successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'success'] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/featured-items POST body / header surface', () => {
	for (const { headers, label } of ADMIN_FEATURED_ITEMS_CREATE_HEADERS) {
		test(`POST ${FEATURED_ITEMS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(FEATURED_ITEMS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_FEATURED_ITEMS_CREATE_BODIES) {
		test(`POST ${FEATURED_ITEMS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(FEATURED_ITEMS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${FEATURED_ITEMS_PATH} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.post(FEATURED_ITEMS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`POST ${FEATURED_ITEMS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(FEATURED_ITEMS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${FEATURED_ITEMS_PATH} unauth branch lands on 401 (NOT 403)`, async ({ request }) => {
		// The 403 'Tenant not found' branch only fires
		// when the user IS authenticated AND has no
		// tenant. The unauth client lacks any session, so
		// the FIRST gate-step ('Unauthorized') fires
		// instead.
		const response = await request.post(FEATURED_ITEMS_PATH);
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).not.toBe('Tenant not found');
	});

	test(`POST ${FEATURED_ITEMS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(FEATURED_ITEMS_PATH, { data: VALID_BODY });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${FEATURED_ITEMS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(FEATURED_ITEMS_PATH),
			request.post(FEATURED_ITEMS_PATH, { data: {} }),
			request.post(FEATURED_ITEMS_PATH, { data: VALID_BODY })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(FEATURED_ITEMS_PATH);
		const responses = await Promise.all([
			request.post(FEATURED_ITEMS_PATH, { data: {} }),
			request.post(FEATURED_ITEMS_PATH, { data: VALID_BODY }),
			request.post(FEATURED_ITEMS_PATH, { data: { ...VALID_BODY, featuredOrder: 10 } }),
			request.post(FEATURED_ITEMS_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(FEATURED_ITEMS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(FEATURED_ITEMS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(FEATURED_ITEMS_PATH),
			request.patch(FEATURED_ITEMS_PATH),
			request.delete(FEATURED_ITEMS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(FEATURED_ITEMS_PATH, { data: 'not-json' }),
			request.post(FEATURED_ITEMS_PATH, { data: '{ broken: json' }),
			request.post(FEATURED_ITEMS_PATH, { data: '{"itemSlug":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} required-fields check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(FEATURED_ITEMS_PATH, { data: {} }),
			request.post(FEATURED_ITEMS_PATH, { data: { itemSlug: 'x' } }),
			request.post(FEATURED_ITEMS_PATH, { data: { itemName: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Item slug and name are required');
		}
	});

	test(`POST ${FEATURED_ITEMS_PATH} already-featured check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, an inline Drizzle select
		// against `featuredItems` with `eq(itemSlug)` +
		// `eq(isActive, true)` + tenant scoping returns
		// 400 'Item is already featured' if a row exists.
		// The unauth branch must NEVER reach this check.
		const response = await request.post(FEATURED_ITEMS_PATH, { data: VALID_BODY });
		const body = await response.json();
		expect(body.error).not.toBe('Item is already featured');
	});

	test(`POST ${FEATURED_ITEMS_PATH} Drizzle insert is NOT entered on the unauth branch`, async ({ request }) => {
		const response = await request.post(FEATURED_ITEMS_PATH, {
			data: { ...VALID_BODY, featuredUntil: '2025-12-31T23:59:59.000Z' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
	});
});
