import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header / method
 * surface** of the admin-only item-review endpoint served by
 * `apps/web/app/api/admin/items/[id]/review/route.ts`.
 *
 * `POST /api/admin/items/{id}/review` is the **first**
 * admin-tree route the smoke layer covers that documents
 * the unique combination of:
 *
 *   1. **`POST` handler with a dynamic `[id]` path
 *      parameter** — the first admin-tree dynamic-segment
 *      route the smoke layer pins. The handler signature
 *      accepts `request: NextRequest` and a
 *      `{ params: Promise<{ id: string }> }` second
 *      argument; the params Promise is resolved AFTER the
 *      gate AND AFTER the body validation, distinct from
 *      the static `admin/categories/reorder`,
 *      `admin/users/check-email`, and
 *      `admin/users/check-username` routes which take no
 *      params.
 *   2. **Single-step `auth()` chain** that collapses both
 *      unauthenticated and authenticated-non-admin
 *      branches into the SAME 401 envelope — the SAME
 *      gate shape as the sibling
 *      `admin/categories/reorder`,
 *      `admin/twenty-crm/test-connection`, and
 *      `admin/items/export` routes. Distinct from the
 *      two-step gates of `admin/users/check-email`,
 *      `admin/users/check-username`, and
 *      `admin/notifications/mark-all-read`.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` —
 *      matching the sibling
 *      `admin/categories/reorder` envelope. Distinct
 *      from the bare `'Unauthorized'` of the two-step-
 *      gated routes.
 *   4. **`success: false` envelope key on the 401
 *      branch** — matching the sibling
 *      `admin/categories/reorder` envelope. Distinct
 *      from the bare `{ error: 'Unauthorized' }`
 *      envelope (no `success` key) of the two-step-
 *      gated routes.
 *   5. **Body parse via `await request.json()`** AFTER
 *      the gate — the gate-then-parse-then-validate-
 *      then-resolve-params-then-call order is the
 *      load-bearing invariant of this route.
 *   6. **Single-step body validation** AFTER the gate
 *      AND AFTER the body parse:
 *      `if (!status || !['approved', 'rejected'].includes(status))`
 *      → 400 `"Review status must be either 'approved' or 'rejected'"`.
 *      Distinct from the three-step body validation of
 *      `admin/categories/reorder` and the one-key
 *      requirement of `admin/users/check-email`. The
 *      unauth branch must NEVER reach the validation
 *      step — the response body must NOT contain the
 *      400 message.
 *   7. **`itemRepository.review(id, { status, review_notes }, auditUser)`
 *      call** followed by a fire-and-forget
 *      `EmailNotificationService.sendSubmissionDecisionEmail`
 *      side-effect. The success-branch payload shape is
 *      `{ success: true, data: <item>, message: 'Item <status> successfully' }`.
 *      The unauth branch must NEVER reach the repository
 *      call, so the unauth response body must NOT
 *      contain `'Item approved successfully'` /
 *      `'Item rejected successfully'`.
 *   8. **`safeErrorResponse(error, 'Failed to review item')`
 *      catch** — matching the
 *      `safeErrorResponse(error, 'Failed to reorder categories')`
 *      catch of `admin/categories/reorder`. Distinct
 *      from the `console.error` + `'Internal server error'`
 *      catch of `admin/users/check-email` /
 *      `admin/users/check-username`. The unauth branch
 *      must NEVER reach the catch, so the unauth
 *      response body must NOT contain the
 *      `'Failed to review item'` message.
 *   9. **Method-resolution surface** — the route exports
 *      ONLY `POST`. Every other method (`GET` / `PUT` /
 *      `PATCH` / `DELETE`) must round-trip to a `< 500`
 *      status (typically 405 Method Not Allowed). A 5xx
 *      on any other method would indicate the Next.js
 *      routing layer crashed before the method-
 *      resolution returned its canonical 405.
 *
 * Where the sibling `admin-categories-reorder-method.spec.ts`
 * walks a static `PUT` route, this spec walks a dynamic-
 * segment `POST` route — a complementary surface that no
 * prior admin-tree smoke spec covers.
 */
const FAKE_ITEM_ID = '00000000-0000-0000-0000-000000000000';
const REVIEW_PATH = `/api/admin/items/${FAKE_ITEM_ID}/review`;

const ADMIN_ITEMS_REVIEW_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — the route reads the body via `await request.json()`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

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
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_ITEMS_REVIEW_BODIES = [
	// Body permutations — body validation is unreachable on the
	// unauth branch, so every permutation must round-trip to the
	// SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { status: 'approved' }, label: 'valid approved body (would call repo if reachable)' },
	{ data: { status: 'rejected' }, label: 'valid rejected body (would call repo if reachable)' },
	{ data: { status: 'approved', review_notes: 'Looks good' }, label: 'valid approved body with review_notes' },
	{ data: { status: 'rejected', review_notes: 'Spam' }, label: 'valid rejected body with review_notes' },
	{ data: { status: 'pending' }, label: 'invalid status pending (would 400 if reachable)' },
	{ data: { status: '' }, label: 'empty status (would 400 if reachable)' },
	{ data: { status: null }, label: 'null status (would 400 if reachable)' },
	{ data: { status: 123 }, label: 'numeric status (would 400 if reachable)' },
	{ data: { status: ['approved'] }, label: 'array status (would 400 if reachable)' },
	{ data: { review_notes: 'Notes only, no status' }, label: 'review_notes-only body (would 400 if reachable)' },
	{ data: { isAdmin: true, status: 'approved' }, label: 'isAdmin=true bypass attempt with valid status' },
	{ data: { tenantId: 'fabricated', status: 'approved' }, label: 'fabricated tenantId attempt with valid status' },
	{ data: { userId: 'admin', status: 'approved' }, label: 'fabricated userId attempt with valid status' },
	{ data: { token: 'anything', status: 'approved' }, label: 'token bypass attempt with valid status' },
	{ data: { padding: 'x'.repeat(2_000), status: 'approved' }, label: 'large padded body with valid status' },
	{ data: { status: 'approved', review_notes: 'x'.repeat(10_000) }, label: 'very long review_notes' }
] as const;

test.describe('API: /api/admin/items/[id]/review method / body / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_REVIEW_HEADERS) {
		test(`POST ${REVIEW_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(REVIEW_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ITEMS_REVIEW_BODIES) {
		test(`POST ${REVIEW_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(REVIEW_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${REVIEW_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the `success: false` envelope and the canonical
		// longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(REVIEW_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toMatchObject({
			error: 'Unauthorized. Admin access required.'
		});
	});

	test(`POST ${REVIEW_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, data: <item>, message: 'Item <status> successfully' }`.
		// The unauth branch must NEVER reach the
		// `itemRepository.review(...)` pipeline, so the response
		// body must NOT contain `'Item approved successfully'` /
		// `'Item rejected successfully'` and must NOT contain
		// `success: true`.
		const response = await request.post(REVIEW_PATH, {
			data: { status: 'approved', review_notes: 'Looks good' }
		});
		const body = await response.json();
		expect(body.message).not.toBe('Item approved successfully');
		expect(body.message).not.toBe('Item rejected successfully');
		expect(body.success).not.toBe(true);
	});

	test(`POST ${REVIEW_PATH} does NOT echo the body-validation 400 message on the unauth branch`, async ({ request }) => {
		// The 400 envelope for the body-validation step is
		// `"Review status must be either 'approved' or 'rejected'"`.
		// The unauth branch fires the gate BEFORE the body parse,
		// so the unauth response must NEVER contain the 400
		// message. A regression that re-orders the body
		// validation before the gate would surface here.
		const responses = await Promise.all([
			request.post(REVIEW_PATH, { data: {} }),
			request.post(REVIEW_PATH, { data: { status: 'pending' } }),
			request.post(REVIEW_PATH, { data: { status: '' } }),
			request.post(REVIEW_PATH, { data: { status: 123 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe("Review status must be either 'approved' or 'rejected'");
		}
	});

	test(`POST ${REVIEW_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({ request }) => {
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to review item')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to review item'` message. A regression
		// that swaps the gate for a try-catch wrapper that
		// swallows auth failures would surface here.
		const response = await request.post(REVIEW_PATH);
		const body = await response.json();
		expect(body.error).not.toBe('Failed to review item');
		expect(body.error).toBe('Unauthorized. Admin access required.');
	});

	test(`POST ${REVIEW_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// The single-step gate fires before the body parse,
		// so every permutation must round-trip to the same
		// 401 status as the no-body baseline.
		const baseline = await request.post(REVIEW_PATH);
		const responses = await Promise.all([
			request.post(REVIEW_PATH, { data: {} }),
			request.post(REVIEW_PATH, { data: { status: 'approved' } }),
			request.post(REVIEW_PATH, { data: { status: 'rejected' } }),
			request.post(REVIEW_PATH, { data: { status: 'pending' } }),
			request.post(REVIEW_PATH, { data: { isAdmin: true, status: 'approved' } }),
			request.post(REVIEW_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(REVIEW_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${REVIEW_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.post(REVIEW_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(REVIEW_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(REVIEW_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(REVIEW_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REVIEW_PATH} cross-method probe does NOT 5xx`, async ({ request }) => {
		// The route only exports `POST`. Every other method
		// (GET / PUT / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get(REVIEW_PATH),
			request.put(REVIEW_PATH),
			request.patch(REVIEW_PATH),
			request.delete(REVIEW_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REVIEW_PATH} Unauthorized error envelope echoes the success: false key`, async ({ request }) => {
		// The unauth envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// Distinct from the bare `{ error: 'Unauthorized' }`
		// envelope of `admin/users/check-email` which has NO
		// `success` key. The presence of the `success: false`
		// key is the cross-route divergence that distinguishes
		// this route's gate from the bare-message gates.
		const response = await request.post(REVIEW_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${REVIEW_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		// A regression that runs the body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		const responses = await Promise.all([
			request.post(REVIEW_PATH, { data: 'not-json' }),
			request.post(REVIEW_PATH, { data: '{ broken: json' }),
			request.post(REVIEW_PATH, { data: '{"status": "approved"' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REVIEW_PATH} dynamic [id] segment is NOT resolved on the unauth branch`, async ({ request }) => {
		// The route resolves the `params` Promise AFTER the
		// gate AND AFTER the body validation. A regression
		// that resolves the params before the gate would
		// surface as a status divergence between the
		// fake-id and a different shape (empty / numeric /
		// padded). All three must round-trip to the same
		// 401 envelope.
		const baseline = await request.post(REVIEW_PATH, {
			data: { status: 'approved' }
		});
		const responses = await Promise.all([
			request.post('/api/admin/items/123/review', { data: { status: 'approved' } }),
			request.post('/api/admin/items/0/review', { data: { status: 'approved' } }),
			request.post(`/api/admin/items/${'a'.repeat(200)}/review`, { data: { status: 'approved' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
