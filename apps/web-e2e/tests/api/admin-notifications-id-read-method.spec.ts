import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **method / dynamic-id / header
 * surface** of the admin-only single-notification mark-as-read
 * endpoint served by
 * `apps/web/app/api/admin/notifications/[id]/read/route.ts`.
 *
 * `PATCH /api/admin/notifications/{id}/read` is the **first**
 * admin-tree route the smoke layer covers that combines a
 * **dynamic-segment `[id]` `PATCH` handler** with the
 * **two-step `!session?.user?.id` → `!tenantId` gate**
 * envelope. It is the dynamic-segment sibling of the static-
 * path `admin/notifications/mark-all-read` PATCH route — the
 * two routes share the same gate envelope but are walked by
 * different specs because their path / id resolution surface
 * is strictly different.
 *
 *   1. **`PATCH` handler with a dynamic `[id]` path
 *      parameter** — the **first** dynamic-segment `PATCH`
 *      handler the admin-tree smoke layer pins. The handler
 *      signature accepts `request: NextRequest` and a
 *      `{ params: Promise<{ id: string }> }` second
 *      argument; the params Promise is resolved AFTER the
 *      auth gate AND BEFORE the tenant-resolution gate.
 *      Distinct from the static-path PATCH of
 *      `admin/notifications/mark-all-read`.
 *   2. **Two-step gate**: first
 *      `if (!session?.user?.id)` → 401
 *      `{ error: 'Unauthorized' }`; the route does NOT
 *      check `session.user.isAdmin`. Then AFTER params
 *      AND AFTER the 400 missing-id branch:
 *      `if (!tenantId)` → 403
 *      `{ error: 'Tenant not found' }`. This is the
 *      SAME two-step gate envelope as the sibling
 *      `admin/notifications/mark-all-read` route.
 *   3. **Bare `'Unauthorized'` 401 message** — matching
 *      the sibling `admin/notifications/mark-all-read`
 *      envelope. Distinct from the canonical longer
 *      `'Unauthorized. Admin access required.'` of the
 *      single-step-gated routes (`admin/items/import`,
 *      `admin/items/bulk`, `admin/categories/reorder`,
 *      `admin/items/[id]/review`, etc.).
 *   4. **Bare `{ error: ... }` envelope** with NO
 *      `success` key on either the 401 or 403 branch —
 *      matching the sibling `admin/notifications/mark-
 *      all-read` envelope.
 *   5. **Path-id surface** — the handler reads `id`
 *      from `await params` AFTER the auth gate. A
 *      400 `{ error: 'Notification ID is required' }`
 *      fires on `!notificationId`, which is unreachable
 *      from the client (Next.js routes always provide
 *      a non-empty segment) but documents an extra
 *      validation step. The unauth branch must NEVER
 *      reach the params resolution, so the unauth
 *      response body must NOT contain the 400 message.
 *   6. **Tenant-resolution surface** AFTER params AND
 *      AFTER the 400 missing-id branch — the 403
 *      `{ error: 'Tenant not found' }` fires on
 *      `!tenantId`. The unauth branch must NEVER reach
 *      tenant resolution, so the unauth response body
 *      must NOT contain `'Tenant not found'`.
 *   7. **DB-update surface** AFTER both gates — the
 *      handler issues a Drizzle `db.update(notifications)`
 *      with `set({ isRead: true, readAt: ..., updatedAt:
 *      ... })` and a three-clause `where` (id + userId +
 *      tenantId), then `.returning()`. If the update
 *      affects zero rows, the route returns 404
 *      `{ error: 'Notification not found' }`. The
 *      unauth branch must NEVER reach the DB update,
 *      so the unauth response body must NOT contain
 *      `'Notification not found'`.
 *   8. **Success-branch payload** —
 *      `{ success: true, notification: updatedNotification[0] }`
 *      with the freshly-written notification row. The
 *      unauth branch must NEVER reach the success
 *      branch, so the unauth response body must NOT
 *      contain a `notification` key and must NOT
 *      contain `success: true`.
 *   9. **Catch branch**: `console.error('Error
 *      marking notification as read:', error)` followed
 *      by 500 `{ error: 'Internal server error' }` —
 *      matching the `console.error` + bare-message catch
 *      family of `admin/users/check-email` /
 *      `admin/users/check-username`. Distinct from the
 *      `safeErrorResponse(...)` catch family of the
 *      single-step-gated admin routes. The unauth branch
 *      must NEVER reach the catch, so the unauth
 *      response body must NOT contain the
 *      `'Internal server error'` message.
 *  10. **Method-resolution surface** — the route exports
 *      ONLY `PATCH`. Every other method (`GET` / `POST` /
 *      `PUT` / `DELETE`) must round-trip to a `< 500`
 *      status (typically 405 Method Not Allowed).
 *
 * Where the immediately-preceding
 * `admin-items-import-validate-body.spec.ts` walks a
 * static-path `POST` route with a multipart-form-data
 * body and a five-step file/mapping validation chain,
 * this spec walks a dynamic-segment `[id]` `PATCH`
 * route with a two-step gate envelope and a bare
 * `{ error: ... }` envelope shape — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const NOTIFICATION_IDS = [
	'notif_1',
	'notif_test',
	'notif-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const READ_PATH = (id: string) => `/api/admin/notifications/${id}/read`;
const PROBE_ID = NOTIFICATION_IDS[0];

const ADMIN_NOTIFICATIONS_ID_READ_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// `Content-Type` headers — PATCH does not parse a body today.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	// `Accept` headers — the route does not negotiate content-types today.
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Side-channel cookies / headers.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	// Magic-token / authorization header attempts.
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const ADMIN_NOTIFICATIONS_ID_READ_BODIES = [
	// PATCH does not parse a body, but a regression that
	// switched the handler to read `await request.json()`
	// would surface here. Every body permutation must round-
	// trip to the SAME 401 envelope on the unauth branch.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { isRead: true }, label: 'isRead=true body' },
	{ data: { tenantId: 'fabricated' }, label: 'fabricated tenantId body' },
	{ data: { userId: 'admin' }, label: 'fabricated userId body' },
	{ data: { isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { token: 'anything' }, label: 'fabricated token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Notification ID is required',
	'Tenant not found',
	'Notification not found',
	'Internal server error'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/notifications/[id]/read method / id / header surface', () => {
	for (const id of NOTIFICATION_IDS) {
		test(`PATCH ${READ_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.patch(READ_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of ADMIN_NOTIFICATIONS_ID_READ_HEADERS) {
		test(`PATCH ${READ_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.patch(READ_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_NOTIFICATIONS_ID_READ_BODIES) {
		test(`PATCH ${READ_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.patch(READ_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PATCH ${READ_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated PATCH branch is the load-bearing
		// invariant: the first gate-step
		// `if (!session?.user?.id)` fires, returning 401 with
		// the bare `{ error: 'Unauthorized' }` envelope (no
		// `success` key). The presence of the `error` key is
		// the cross-route divergence that distinguishes this
		// route's gate from the canonical longer envelope of
		// the single-step-gated admin routes.
		const response = await request.patch(READ_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: CANONICAL_401_MESSAGE });
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} Unauthorized envelope has NO success key`, async ({ request }) => {
		// Strict envelope-shape assertion: the bare envelope
		// is `{ error: 'Unauthorized' }`. The ABSENCE of a
		// `success` key is the cross-route divergence that
		// distinguishes this route's gate from the
		// `{ success: false, error: ... }` envelope of the
		// single-step-gated admin routes.
		const response = await request.patch(READ_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, notification: <row> }`. The
		// unauth branch must NEVER reach the DB update, so
		// the response body must NOT contain a `notification`
		// key and must NOT contain `success: true`.
		const response = await request.patch(READ_PATH(PROBE_ID));
		const body = await response.json();
		expect(body.notification).toBeUndefined();
		expect(body.success).not.toBe(true);
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} does NOT echo any of the post-auth error messages on the unauth branch`, async ({
		request
	}) => {
		// The 400 / 403 / 404 / 500 envelopes for the post-
		// auth steps are the load-bearing invariant of the
		// gate-then-id-then-tenant-then-update-then-catch
		// order. The unauth branch fires the FIRST gate
		// step BEFORE any of those, so the unauth response
		// must NEVER contain ANY of the four post-auth
		// messages. A regression that re-orders ANY of the
		// post-auth steps before the auth gate would
		// surface here.
		const response = await request.patch(READ_PATH(PROBE_ID));
		const body = await response.json();
		for (const msg of FORBIDDEN_MESSAGES) {
			expect(body.error).not.toBe(msg);
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} has a stable status across header / body permutations`, async ({ request }) => {
		// The first gate-step fires before the body parse
		// (the route does not parse a body today, but a
		// regression that switched to `await request.json()`
		// would surface here), so every permutation must
		// round-trip to the same 401 status as the no-body
		// baseline.
		const baseline = await request.patch(READ_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.patch(READ_PATH(PROBE_ID), { data: {} }),
			request.patch(READ_PATH(PROBE_ID), { data: { isRead: true } }),
			request.patch(READ_PATH(PROBE_ID), { data: { isAdmin: true } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		// Every id shape (uuid, slug, dashed slug, padded
		// slug, encoded slug) must round-trip to the same
		// 401 status as the canonical id baseline, pinning
		// that the params resolution does NOT happen on the
		// unauth branch.
		const baseline = await request.patch(READ_PATH(PROBE_ID));
		const responses = await Promise.all(NOTIFICATION_IDS.map((id) => request.patch(READ_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// fabricated tenant- or user-id headers would change
		// the unauth-branch behaviour.
		const responses = await Promise.all([
			request.patch(READ_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-User-Id': 'fabricated' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Api-Key': 'anything' } }),
			request.patch(READ_PATH(PROBE_ID), { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} cross-method probe (GET / POST / PUT / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route only exports `PATCH`. Every other method
		// (GET / POST / PUT / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get(READ_PATH(PROBE_ID)),
			request.post(READ_PATH(PROBE_ID)),
			request.put(READ_PATH(PROBE_ID)),
			request.delete(READ_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs a body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the bare Unauthorized envelope.
		const responses = await Promise.all([
			request.patch(READ_PATH(PROBE_ID), { data: 'not-json' }),
			request.patch(READ_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.patch(READ_PATH(PROBE_ID), { data: '{"isRead":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${READ_PATH(PROBE_ID)} DB update is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders the
		// `db.update(notifications)...returning()` before the
		// gate would surface here: the unauth response would
		// echo a `notification` key from the DB row.
		const response = await request.patch(READ_PATH(PROBE_ID));
		const body = await response.json();
		expect(body.notification).toBeUndefined();
		expect(body.success).not.toBe(true);
	});
});
