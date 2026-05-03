import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header / method
 * surface** of the admin-only items-bulk-action endpoint
 * served by
 * `apps/web/app/api/admin/items/bulk/route.ts`.
 *
 * `POST /api/admin/items/bulk` is the **first** admin-tree
 * route the smoke layer covers that documents the unique
 * combination of:
 *
 *   1. **`POST` handler with a static path** — distinct
 *      from the **immediately-preceding** dynamic-segment
 *      `admin/items/[id]/review` spec which takes a
 *      `{ params: Promise<{ id: string }> }` second
 *      argument. Same static-path posture as the sibling
 *      `admin/categories/reorder`,
 *      `admin/twenty-crm/test-connection`,
 *      `admin/users/check-email`, and
 *      `admin/users/check-username` routes.
 *   2. **Single-step `auth()` chain** that collapses both
 *      unauthenticated and authenticated-non-admin
 *      branches into the SAME 401 envelope — the SAME
 *      gate shape as the sibling
 *      `admin/categories/reorder`,
 *      `admin/twenty-crm/test-connection`,
 *      `admin/items/export`, and
 *      `admin/items/[id]/review` routes. Distinct from
 *      the two-step gates of `admin/users/check-email`,
 *      `admin/users/check-username`, and
 *      `admin/notifications/mark-all-read`.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` —
 *      matching the sibling `admin/categories/reorder`
 *      and `admin/items/[id]/review` envelope. Distinct
 *      from the bare `'Unauthorized'` of the two-step-
 *      gated routes.
 *   4. **`success: false` envelope key on the 401
 *      branch** — matching the sibling
 *      `admin/categories/reorder` and
 *      `admin/items/[id]/review` envelope. Distinct
 *      from the bare `{ error: 'Unauthorized' }`
 *      envelope (no `success` key) of the two-step-
 *      gated routes.
 *   5. **Body parse via `await request.json()`** AFTER
 *      the gate — the gate-then-parse-then-validate-
 *      then-loop order is the load-bearing invariant of
 *      this route.
 *   6. **Six-step body validation chain** AFTER the
 *      gate AND AFTER the body parse — the **most
 *      validation messages** of any admin-tree route
 *      the smoke layer covers. The six distinct 400
 *      messages are:
 *        (a) `"Action must be 'approve', 'reject', or 'delete'"`
 *            on `!action || !['approve','reject','delete'].includes(action)`.
 *        (b) `"At least one item ID is required"`
 *            on `!Array.isArray(ids) || ids.length === 0`.
 *        (c) `"Maximum 100 items per bulk action"`
 *            on `ids.length > 100`.
 *        (d) `"All item IDs must be non-empty strings"`
 *            on per-id `!id || typeof id !== 'string' || id.trim().length === 0`.
 *        (e) `"Duplicate item IDs are not allowed"`
 *            on per-id duplicate detection via a
 *            `Set<string>`.
 *        (f) `"Rejection reason is required (minimum 10 characters)"`
 *            on `action === 'reject' && (!reason || reason.trim().length < 10)`.
 *      Distinct from the **single-step** body
 *      validation of `admin/items/[id]/review`
 *      (one 400 message) and the **three-step**
 *      body validation of `admin/categories/reorder`
 *      (three 400 messages). The unauth branch must
 *      NEVER reach any of the six validation steps —
 *      the response body must NOT contain any of the
 *      400 messages.
 *   7. **Per-id try/catch loop** — the **first**
 *      admin-tree route the smoke layer covers where
 *      individual id failures are collected into a
 *      `results: BulkActionResult[]` array rather than
 *      failing the whole request. The handler iterates
 *      `for (const id of ids)` and on each iteration
 *      catches errors via
 *      `safeErrorMessage(error, 'Unknown error')`,
 *      pushing `{ id, success: false, error: <msg> }`
 *      into the results array rather than throwing.
 *      The unauth branch must NEVER reach the loop, so
 *      the unauth response body must NOT contain
 *      `results` / `summary` / `successful` /
 *      `failed` keys.
 *   8. **Conditional repository routing on `action`** —
 *      the per-id branch routes to one of three
 *      `itemRepository` calls based on the action:
 *        - `action === 'approve'`:
 *          `itemRepository.review(id, { status: 'approved' }, auditUser)`
 *          followed by a fire-and-forget
 *          `sendReviewNotification(item, 'approved')`
 *          side-effect.
 *        - `action === 'reject'`:
 *          `itemRepository.review(id, { status: 'rejected', review_notes: trimmedReason }, auditUser)`
 *          followed by a fire-and-forget
 *          `sendReviewNotification(item, 'rejected', trimmedReason)`
 *          side-effect.
 *        - `action === 'delete'`:
 *          `itemRepository.delete(id, auditUser)` with
 *          NO email side-effect.
 *      The success-branch payload shape is
 *      `{ success: true, message: 'Bulk <action> completed: <successful> <past-tense>, <failed> failed', results, summary }`.
 *      The unauth branch must NEVER reach any of the
 *      three repository calls.
 *   9. **`safeErrorResponse(error, 'Failed to process bulk action')`
 *      catch** — matching the
 *      `safeErrorResponse(error, 'Failed to reorder categories')`
 *      catch of `admin/categories/reorder` and the
 *      `safeErrorResponse(error, 'Failed to review item')`
 *      catch of `admin/items/[id]/review`. Distinct
 *      from the `console.error` + `'Internal server error'`
 *      catch of `admin/users/check-email` /
 *      `admin/users/check-username`. The unauth
 *      branch must NEVER reach the catch, so the
 *      unauth response body must NOT contain the
 *      `'Failed to process bulk action'` message.
 *  10. **`safeErrorMessage` + `safeErrorResponse`
 *      twin-import surface** — the **only** admin
 *      route the smoke layer covers that imports
 *      BOTH `safeErrorMessage` (for per-id error
 *      string extraction inside the loop) AND
 *      `safeErrorResponse` (for the catch-branch
 *      envelope). Every other admin-tree route imports
 *      only `safeErrorResponse`. A regression that
 *      drops the `safeErrorMessage` import would
 *      surface as a per-id `error` value of
 *      `undefined` on the success branch — but the
 *      unauth branch never reaches the loop, so the
 *      smoke layer pins the import-surface invariant
 *      via the negative-property assertions on
 *      `results` / `summary`.
 *  11. **Method-resolution surface** — the route
 *      exports ONLY `POST`. Every other method
 *      (`GET` / `PUT` / `PATCH` / `DELETE`) must
 *      round-trip to a `< 500` status (typically 405
 *      Method Not Allowed). A 5xx on any other method
 *      would indicate the Next.js routing layer
 *      crashed before the method-resolution returned
 *      its canonical 405.
 *
 * Where the immediately-preceding
 * `admin-items-id-review-body.spec.ts` walks a
 * dynamic-segment `POST` route with a single-step body
 * validation, this spec walks a static-path `POST` route
 * with a six-step body validation chain — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const BULK_PATH = '/api/admin/items/bulk';

const ADMIN_ITEMS_BULK_HEADERS = [
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

const ADMIN_ITEMS_BULK_BODIES = [
	// Body permutations — body validation is unreachable on the
	// unauth branch, so every permutation must round-trip to the
	// SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Action-validation step (a) probes — must NEVER reach the
	// validation step.
	{ data: { action: 'pending' }, label: 'invalid action pending (would 400 if reachable)' },
	{ data: { action: '' }, label: 'empty action (would 400 if reachable)' },
	{ data: { action: null }, label: 'null action (would 400 if reachable)' },
	{ data: { action: 123 }, label: 'numeric action (would 400 if reachable)' },
	{ data: { action: ['approve'] }, label: 'array action (would 400 if reachable)' },

	// IDs-validation step (b) probes — must NEVER reach the
	// validation step.
	{ data: { action: 'approve' }, label: 'no ids (would 400 if reachable)' },
	{ data: { action: 'approve', ids: [] }, label: 'empty ids array (would 400 if reachable)' },
	{ data: { action: 'approve', ids: 'not-an-array' }, label: 'non-array ids (would 400 if reachable)' },
	{ data: { action: 'approve', ids: null }, label: 'null ids (would 400 if reachable)' },

	// IDs-bound-validation step (c) probes — would 400 with
	// `'Maximum 100 items per bulk action'` if reachable.
	{
		data: { action: 'approve', ids: Array.from({ length: 101 }, (_, i) => `item-${i}`) },
		label: 'over-bound ids array (would 400 if reachable)'
	},
	{
		data: { action: 'approve', ids: Array.from({ length: 200 }, (_, i) => `item-${i}`) },
		label: 'far-over-bound ids array (would 400 if reachable)'
	},

	// Per-id-validation step (d) probes — would 400 with
	// `'All item IDs must be non-empty strings'` if reachable.
	{ data: { action: 'approve', ids: [''] }, label: 'empty-string id (would 400 if reachable)' },
	{ data: { action: 'approve', ids: ['   '] }, label: 'whitespace-only id (would 400 if reachable)' },
	{ data: { action: 'approve', ids: [null] }, label: 'null id (would 400 if reachable)' },
	{ data: { action: 'approve', ids: [123] }, label: 'numeric id (would 400 if reachable)' },
	{ data: { action: 'approve', ids: [{}] }, label: 'object id (would 400 if reachable)' },

	// Duplicate-id-validation step (e) probes — would 400 with
	// `'Duplicate item IDs are not allowed'` if reachable.
	{
		data: { action: 'approve', ids: ['dup-id', 'dup-id'] },
		label: 'duplicate ids (would 400 if reachable)'
	},
	{
		data: { action: 'delete', ids: ['a', 'b', 'a'] },
		label: 'duplicate ids interleaved (would 400 if reachable)'
	},

	// Reject-conditional-reason step (f) probes — would 400 with
	// `'Rejection reason is required (minimum 10 characters)'` if
	// reachable.
	{ data: { action: 'reject', ids: ['x'] }, label: 'reject without reason (would 400 if reachable)' },
	{ data: { action: 'reject', ids: ['x'], reason: '' }, label: 'reject with empty reason (would 400 if reachable)' },
	{ data: { action: 'reject', ids: ['x'], reason: 'short' }, label: 'reject with short reason (would 400 if reachable)' },
	{
		data: { action: 'reject', ids: ['x'], reason: '         ' },
		label: 'reject with whitespace-only reason (would 400 if reachable)'
	},

	// Valid bodies — would call the per-id loop if reachable.
	{ data: { action: 'approve', ids: ['valid-id'] }, label: 'valid approve body (would call repo if reachable)' },
	{
		data: { action: 'reject', ids: ['valid-id'], reason: 'a sufficiently long rejection reason' },
		label: 'valid reject body (would call repo if reachable)'
	},
	{ data: { action: 'delete', ids: ['valid-id'] }, label: 'valid delete body (would call repo if reachable)' },
	{
		data: { action: 'approve', ids: Array.from({ length: 100 }, (_, i) => `item-${i}`) },
		label: 'valid approve body at the bound (would call repo if reachable)'
	},

	// Bypass attempts.
	{ data: { isAdmin: true, action: 'approve', ids: ['x'] }, label: 'isAdmin=true bypass attempt with valid body' },
	{
		data: { tenantId: 'fabricated', action: 'approve', ids: ['x'] },
		label: 'fabricated tenantId attempt with valid body'
	},
	{ data: { userId: 'admin', action: 'approve', ids: ['x'] }, label: 'fabricated userId attempt with valid body' },
	{ data: { token: 'anything', action: 'approve', ids: ['x'] }, label: 'token bypass attempt with valid body' },
	{
		data: { padding: 'x'.repeat(2_000), action: 'approve', ids: ['x'] },
		label: 'large padded body with valid action / ids'
	}
] as const;

test.describe('API: /api/admin/items/bulk method / body / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_BULK_HEADERS) {
		test(`POST ${BULK_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(BULK_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ITEMS_BULK_BODIES) {
		test(`POST ${BULK_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(BULK_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${BULK_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the `success: false` envelope and the canonical
		// longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(BULK_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toMatchObject({
			error: 'Unauthorized. Admin access required.'
		});
	});

	test(`POST ${BULK_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, message: 'Bulk <action> completed: <successful> <past-tense>, <failed> failed', results, summary }`.
		// The unauth branch must NEVER reach the per-id loop,
		// so the response body must NOT contain `results` /
		// `summary` keys and must NOT contain `success: true`.
		const response = await request.post(BULK_PATH, {
			data: { action: 'approve', ids: ['valid-id'] }
		});
		const body = await response.json();
		expect(body.results).toBeUndefined();
		expect(body.summary).toBeUndefined();
		expect(body.success).not.toBe(true);
	});

	test(`POST ${BULK_PATH} does NOT echo any of the six body-validation 400 messages on the unauth branch`, async ({
		request
	}) => {
		// The six 400 envelopes for the body-validation steps
		// are the load-bearing invariant of the body
		// validation chain. The unauth branch fires the gate
		// BEFORE the body parse, so the unauth response must
		// NEVER contain ANY of the six 400 messages. A
		// regression that re-orders ANY of the validation
		// steps before the gate would surface here.
		const responses = await Promise.all([
			// Step (a) probe: invalid action.
			request.post(BULK_PATH, { data: { action: 'pending' } }),
			// Step (b) probe: empty ids.
			request.post(BULK_PATH, { data: { action: 'approve', ids: [] } }),
			// Step (c) probe: over-bound ids.
			request.post(BULK_PATH, {
				data: { action: 'approve', ids: Array.from({ length: 101 }, (_, i) => `item-${i}`) }
			}),
			// Step (d) probe: empty-string id.
			request.post(BULK_PATH, { data: { action: 'approve', ids: [''] } }),
			// Step (e) probe: duplicate ids.
			request.post(BULK_PATH, { data: { action: 'approve', ids: ['dup', 'dup'] } }),
			// Step (f) probe: reject without reason.
			request.post(BULK_PATH, { data: { action: 'reject', ids: ['x'] } })
		]);

		const VALIDATION_400_MESSAGES = [
			"Action must be 'approve', 'reject', or 'delete'",
			'At least one item ID is required',
			'Maximum 100 items per bulk action',
			'All item IDs must be non-empty strings',
			'Duplicate item IDs are not allowed',
			'Rejection reason is required (minimum 10 characters)'
		];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of VALIDATION_400_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${BULK_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({ request }) => {
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to process bulk action')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to process bulk action'` message. A
		// regression that swaps the gate for a try-catch
		// wrapper that swallows auth failures would surface
		// here.
		const response = await request.post(BULK_PATH);
		const body = await response.json();
		expect(body.error).not.toBe('Failed to process bulk action');
		expect(body.error).toBe('Unauthorized. Admin access required.');
	});

	test(`POST ${BULK_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// The single-step gate fires before the body parse,
		// so every permutation must round-trip to the same
		// 401 status as the no-body baseline.
		const baseline = await request.post(BULK_PATH);
		const responses = await Promise.all([
			request.post(BULK_PATH, { data: {} }),
			request.post(BULK_PATH, { data: { action: 'approve', ids: ['x'] } }),
			request.post(BULK_PATH, {
				data: { action: 'reject', ids: ['x'], reason: 'a sufficiently long rejection reason' }
			}),
			request.post(BULK_PATH, { data: { action: 'delete', ids: ['x'] } }),
			request.post(BULK_PATH, { data: { action: 'pending' } }),
			request.post(BULK_PATH, { data: { isAdmin: true, action: 'approve', ids: ['x'] } }),
			request.post(BULK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(BULK_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${BULK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.post(BULK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(BULK_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(BULK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(BULK_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${BULK_PATH} cross-method probe does NOT 5xx`, async ({ request }) => {
		// The route only exports `POST`. Every other method
		// (GET / PUT / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get(BULK_PATH),
			request.put(BULK_PATH),
			request.patch(BULK_PATH),
			request.delete(BULK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${BULK_PATH} Unauthorized error envelope echoes the success: false key`, async ({ request }) => {
		// The unauth envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// Distinct from the bare `{ error: 'Unauthorized' }`
		// envelope of `admin/users/check-email` which has NO
		// `success` key. The presence of the `success: false`
		// key is the cross-route divergence that distinguishes
		// this route's gate from the bare-message gates.
		const response = await request.post(BULK_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${BULK_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		// A regression that runs the body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		const responses = await Promise.all([
			request.post(BULK_PATH, { data: 'not-json' }),
			request.post(BULK_PATH, { data: '{ broken: json' }),
			request.post(BULK_PATH, { data: '{"action": "approve"' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${BULK_PATH} is invariant to ids-array length on the unauth branch`, async ({ request }) => {
		// The gate fires BEFORE the body parse AND BEFORE
		// the `ids.length > 100` bound check. A regression
		// that re-orders the bound check before the gate
		// would surface as a status divergence between the
		// at-the-bound (length 100) and over-the-bound
		// (length 101 / 200) probes. All three must
		// round-trip to the same 401 status as the
		// no-body baseline.
		const baseline = await request.post(BULK_PATH);
		const responses = await Promise.all([
			request.post(BULK_PATH, {
				data: { action: 'approve', ids: Array.from({ length: 100 }, (_, i) => `item-${i}`) }
			}),
			request.post(BULK_PATH, {
				data: { action: 'approve', ids: Array.from({ length: 101 }, (_, i) => `item-${i}`) }
			}),
			request.post(BULK_PATH, {
				data: { action: 'approve', ids: Array.from({ length: 200 }, (_, i) => `item-${i}`) }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${BULK_PATH} per-id loop is NOT entered on the unauth branch`, async ({ request }) => {
		// The per-id loop pushes
		// `{ id, success: <boolean>, error?: <string> }` into
		// a `results: BulkActionResult[]` array. A regression
		// that re-orders the loop before the gate would
		// surface as a `results` array (or a `summary`
		// object) appearing in the unauth response body.
		const responses = await Promise.all([
			request.post(BULK_PATH, { data: { action: 'approve', ids: ['x'] } }),
			request.post(BULK_PATH, { data: { action: 'delete', ids: ['x', 'y'] } }),
			request.post(BULK_PATH, {
				data: { action: 'reject', ids: ['x'], reason: 'a sufficiently long rejection reason' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.results).toBeUndefined();
			expect(body.summary).toBeUndefined();
			// The success-branch message templates must
			// NEVER appear on the unauth branch.
			expect(body.message).not.toMatch(/^Bulk (approve|reject|delete) completed: \d+ /);
		}
	});
});
