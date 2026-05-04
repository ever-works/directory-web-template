import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the **non-admin-gated** collection-level notification-
 * create endpoint served by the `POST` export of
 * `apps/web/app/api/admin/notifications/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-notifications-
 * query.spec.ts` covers the GET (paginated list) surface
 * of the same route.
 *
 * `POST /api/admin/notifications` is the **sixth Q-010b-
 * style auth-gate-divergence finding** the smoke layer
 * documents — the route's POST handler **does NOT call
 * `!isAdmin` at any point**. It DOES require an
 * authenticated user (`!session?.user?.id` → 401), so the
 * route is tenant-scoped to authenticated users but is
 * effectively non-admin-restricted. Any authenticated user
 * with a tenant can create notifications for ANY userId in
 * their tenant.
 *
 *   1. **Two-step gate** —
 *        (a) `!session?.user?.id` → 401
 *            `{ success: false, error: 'Unauthorized' }`.
 *        (b) `!tenantId` (after `getTenantId()` AFTER
 *            body parse + required-fields check) → 403
 *            `{ success: false, error: 'Tenant not
 *            found' }`. NOTE: distinct from prior two-
 *            step gates which run `getTenantId()`
 *            BEFORE body parse — this route's tenant
 *            resolution is INTERLEAVED with body
 *            validation.
 *   2. **Hybrid bare-`Unauthorized` + `success: false`
 *      envelope** — matching `admin/users/[id]`,
 *      `admin/featured-items/[id]`, `admin/roles/[id]/
 *      permissions`.
 *   3. **Four-field required check** — `if (!type ||
 *      !title || !message || !userId)` → 400 `'Missing
 *      required fields'`. Distinct from prior multi-
 *      field required checks — this one fires BEFORE
 *      tenant resolution (interleaved gate order).
 *   4. **`getTenantId()` AFTER required-fields check**
 *      — 403 `'Tenant not found'` if missing. The first
 *      collection-level POST smoke that runs the
 *      tenant-resolution check AFTER body validation.
 *   5. **Inline Drizzle insert** with
 *      `notifications` schema + JSON-stringified `data`
 *      field — distinct from prior POST smokes which
 *      delegate to a repository class.
 *   6. **Success payload** with **`notification`
 *      success-key** (NOT `data`) — `{ success: true,
 *      notification: <newNotification[0]> }`. Status
 *      200 (NOT 201). Distinct from prior collection-
 *      level POST smokes.
 *   7. **`console.error` + 500 `'Internal server error'`
 *      catch** — distinct from `admin/items` POST and
 *      `admin/items/[id]` route which use
 *      `safeErrorResponse(...)`.
 *   8. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-roles-create-
 * body.spec.ts` walks the **fully** non-gated POST,
 * this spec walks a tenant-gated-but-non-admin-gated
 * POST — a complementary surface that no prior admin-
 * tree smoke spec covers.
 */
const NOTIFICATIONS_PATH = '/api/admin/notifications';

const ADMIN_NOTIFICATIONS_CREATE_HEADERS = [
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
	type: 'item_approved',
	title: 'Item Approved',
	message: 'Your item has been approved',
	userId: 'user_123'
};

const ADMIN_NOTIFICATIONS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields) if reachable)' },

	// Required-field probes.
	{ data: { title: 'X', message: 'Y', userId: 'u' }, label: 'no type field (would 400 (req-fields) if reachable)' },
	{ data: { type: 't', message: 'Y', userId: 'u' }, label: 'no title field (would 400 (req-fields) if reachable)' },
	{ data: { type: 't', title: 'X', userId: 'u' }, label: 'no message field (would 400 (req-fields) if reachable)' },
	{ data: { type: 't', title: 'X', message: 'Y' }, label: 'no userId field (would 400 (req-fields) if reachable)' },

	// Valid bodies.
	{ data: VALID_BODY, label: 'fully-valid body' },
	{ data: { ...VALID_BODY, data: { itemId: 'item_1' } }, label: 'valid + data (would JSON.stringify if reachable)' },
	{ data: { ...VALID_BODY, data: null }, label: 'valid + null data' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tenant not found',
	'Missing required fields',
	'Internal server error'
] as const;

const FORBIDDEN_KEYS = ['data', 'notification'] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/notifications POST body / header surface', () => {
	for (const { headers, label } of ADMIN_NOTIFICATIONS_CREATE_HEADERS) {
		test(`POST ${NOTIFICATIONS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(NOTIFICATIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_NOTIFICATIONS_CREATE_BODIES) {
		test(`POST ${NOTIFICATIONS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(NOTIFICATIONS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${NOTIFICATIONS_PATH} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.post(NOTIFICATIONS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`POST ${NOTIFICATIONS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(NOTIFICATIONS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${NOTIFICATIONS_PATH} unauth branch lands on 401 (NOT 403)`, async ({ request }) => {
		// The 403 'Tenant not found' branch only fires
		// when the user IS authenticated AND has provided
		// all required fields AND has no tenant. The unauth
		// client lacks any session at all, so the FIRST
		// gate-step ('Unauthorized') fires instead.
		const response = await request.post(NOTIFICATIONS_PATH);
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).not.toBe('Tenant not found');
	});

	test(`POST ${NOTIFICATIONS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch: status 200 with `{ success:
		// true, notification: <notification> }` (NOTE:
		// `notification` key, NOT `data`). The unauth
		// branch must NEVER reach the insert call.
		const response = await request.post(NOTIFICATIONS_PATH, { data: VALID_BODY });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
	});

	test(`POST ${NOTIFICATIONS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(NOTIFICATIONS_PATH),
			request.post(NOTIFICATIONS_PATH, { data: {} }),
			request.post(NOTIFICATIONS_PATH, { data: VALID_BODY })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(NOTIFICATIONS_PATH);
		const responses = await Promise.all([
			request.post(NOTIFICATIONS_PATH, { data: {} }),
			request.post(NOTIFICATIONS_PATH, { data: VALID_BODY }),
			request.post(NOTIFICATIONS_PATH, { data: { ...VALID_BODY, data: { itemId: 'i' } } }),
			request.post(NOTIFICATIONS_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(NOTIFICATIONS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(NOTIFICATIONS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(NOTIFICATIONS_PATH),
			request.patch(NOTIFICATIONS_PATH),
			request.delete(NOTIFICATIONS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(NOTIFICATIONS_PATH, { data: 'not-json' }),
			request.post(NOTIFICATIONS_PATH, { data: '{ broken: json' }),
			request.post(NOTIFICATIONS_PATH, { data: '{"type":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} required-fields check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(NOTIFICATIONS_PATH, { data: {} }),
			request.post(NOTIFICATIONS_PATH, { data: { type: 't' } }),
			request.post(NOTIFICATIONS_PATH, { data: { title: 'X', message: 'Y', userId: 'u' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Missing required fields');
		}
	});

	test(`POST ${NOTIFICATIONS_PATH} tenant-resolution check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Tenant resolution runs only AFTER the required-
		// fields check passes. The unauth branch must
		// NEVER reach this check.
		const response = await request.post(NOTIFICATIONS_PATH, { data: VALID_BODY });
		const body = await response.json();
		expect(body.error).not.toBe('Tenant not found');
	});

	test(`POST ${NOTIFICATIONS_PATH} Drizzle insert is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders `db.insert(...)`
		// before the gate would surface here: the unauth
		// response would echo a `notification` key with
		// the inserted row.
		const response = await request.post(NOTIFICATIONS_PATH, {
			data: { ...VALID_BODY, data: { itemId: 'item_1' } }
		});
		const body = await response.json();
		expect(body.notification).toBeUndefined();
		expect(body.success).not.toBe(true);
	});
});
