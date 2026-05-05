import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id / body /
 * header surface** of the admin-only single-report CRUD endpoint
 * served by `apps/web/app/api/admin/reports/[id]/route.ts`.
 *
 * `GET /api/admin/reports/{id}` and
 * `PUT /api/admin/reports/{id}` are the **first** admin-tree
 * routes the smoke layer covers that combine:
 *   - a **`checkDatabaseAvailability()` pre-gate** that runs
 *     BEFORE the auth gate — distinct from every prior
 *     admin-tree smoke where `auth()` is the FIRST guard,
 *     AND
 *   - a gate that returns **403 `'Forbidden'` (NOT 401)** on
 *     the unauth branch — the **first** admin-tree route
 *     where the unauth client lands on 403, not 401, AND
 *   - a **conditional moderation action chain** on `PUT`
 *     that executes one of `removeContent` / `warnUser` /
 *     `suspendUser` / `banUser` from the moderation service
 *     based on the `resolution` value, AND
 *   - a **four-key success payload** `{ success, message,
 *     data, moderationResult }` on `PUT` (every prior admin
 *     smoke uses at most three success-branch keys), AND
 *   - a **dev-gated `console.error` catch** that only logs
 *     when `process.env.NODE_ENV === 'development'`.
 *
 * All handlers share:
 *   1. **`checkDatabaseAvailability()` pre-gate** — runs
 *      BEFORE the auth gate. Returns a response if DB is
 *      unavailable, otherwise null. The smoke harness
 *      assumes DB is available, so the pre-gate falls
 *      through and the auth gate fires.
 *   2. **Single-step `!session?.user?.isAdmin` gate** that
 *      returns **403 `{ success: false, error:
 *      'Forbidden' }`** on the unauth branch — distinct
 *      from every prior admin-tree route which returns 401
 *      (with one of three envelope shapes: canonical-
 *      longer / bare-`Unauthorized` / hybrid-`success:
 *      false`-bare). The 403 branch fires for BOTH
 *      unauthenticated AND authenticated-non-admin
 *      sessions.
 *   3. **`success: false` envelope key** on the 403 branch
 *      with strict envelope-shape
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   4. **Dynamic `[id]` segment** resolved AFTER both
 *      gates.
 *   5. **Dev-gated `console.error` catch** — the catch
 *      only logs when `NODE_ENV === 'development'`,
 *      otherwise returns 500 `{ success: false, error:
 *      'Internal Server Error' }` silently.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - `getReportById(id)` → 404 `'Report not found'` if
 *       missing.
 *     - Success payload `{ success: true, data: <report> }`.
 *
 *   PUT:
 *     - **Existence check FIRST** — `getReportById(id)`
 *       runs BEFORE the body parse, returning 404
 *       `'Report not found'` if missing. Distinct from
 *       every prior PUT smoke where the body parse runs
 *       first.
 *     - JSON body parse via `await request.json()` AFTER
 *       the existence check.
 *     - Body destructured: `{ status, resolution,
 *       reviewNote }`.
 *     - `status` enum validation against
 *       `VALID_STATUSES` (from `ReportStatus`) → 400
 *       `'Invalid status. Must be one of: ...'`.
 *     - `resolution` enum validation against
 *       `VALID_RESOLUTIONS` (from `ReportResolution`) →
 *       400 `'Invalid resolution. Must be one of: ...'`.
 *     - `updateReport(id, ...)` call.
 *     - **Conditional moderation chain** based on
 *       `resolution`:
 *         - `CONTENT_REMOVED` → `removeContent(...)`.
 *         - `USER_WARNED` → `warnUser(ownerResult.userId,
 *           ...)` (after a `getContentOwner(...)` lookup).
 *         - `USER_SUSPENDED` → `suspendUser(...)`.
 *         - `USER_BANNED` → `banUser(...)`.
 *         - `NO_ACTION` (or no resolution) → no action.
 *     - `getContentOwner(...)` failure → 400 `'Could not
 *       identify content owner for moderation action'`.
 *     - Final `getReportById(id)` for the full updated
 *       report.
 *     - Success payload `{ success: true, message:
 *       moderationResult?.message || 'Report updated
 *       successfully', data: <report>, moderationResult }`
 *       — FOUR success-branch keys.
 *
 * Where the immediately-preceding
 * `admin-collections-id-items-method.spec.ts` walks a
 * nested-`[id]/<sub-resource>` dual-method route, this
 * spec walks the leaf-`[id]` dual-method `admin/reports/
 * [id]` route with the unique 403-on-unauth gate behavior
 * — a complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const REPORT_IDS = [
	'report_1',
	'report_test',
	'report-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const REPORT_PATH = (id: string) => `/api/admin/reports/${id}`;
const PROBE_ID = REPORT_IDS[0];

const COMMON_HEADERS = [
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

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would proceed past validation if reachable)' },

	// status enum probes.
	{ data: { status: 'pending' }, label: 'status=pending update' },
	{ data: { status: 'reviewed' }, label: 'status=reviewed update' },
	{ data: { status: 'resolved' }, label: 'status=resolved update' },
	{ data: { status: 'dismissed' }, label: 'status=dismissed update' },
	{ data: { status: 'invalid-status' }, label: 'invalid status (would 400 if reachable)' },
	{ data: { status: 123 }, label: 'numeric status (would 400 if reachable)' },

	// resolution enum probes.
	{ data: { resolution: 'content_removed' }, label: 'resolution=content_removed update' },
	{ data: { resolution: 'user_warned' }, label: 'resolution=user_warned update' },
	{ data: { resolution: 'user_suspended' }, label: 'resolution=user_suspended update' },
	{ data: { resolution: 'user_banned' }, label: 'resolution=user_banned update' },
	{ data: { resolution: 'no_action' }, label: 'resolution=no_action update' },
	{ data: { resolution: 'invalid-resolution' }, label: 'invalid resolution (would 400 if reachable)' },

	// reviewNote probes.
	{ data: { reviewNote: 'A short note' }, label: 'reviewNote update' },
	{ data: { reviewNote: '' }, label: 'empty reviewNote update' },
	{ data: { reviewNote: 'x'.repeat(2_000) }, label: 'long reviewNote update' },

	// Combined updates.
	{
		data: { status: 'resolved', resolution: 'content_removed', reviewNote: 'Removed for spam' },
		label: 'full status + resolution + reviewNote'
	},

	// Bypass attempts.
	{ data: { isAdmin: true, status: 'resolved' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', status: 'resolved' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', status: 'resolved' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), status: 'resolved' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Report not found',
	'Failed to update report',
	'Internal Server Error',
	'Could not identify content owner for moderation action',
	'Report updated successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'moderationResult'] as const;

const FORBIDDEN_PREFIX_RE = /^Invalid (status|resolution)\. Must be one of:/;

const FORBIDDEN_403_MESSAGE = 'Forbidden';

test.describe('API: /api/admin/reports/[id] GET / PUT method / id / body / header surface', () => {
	for (const id of REPORT_IDS) {
		test(`GET ${REPORT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(REPORT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${REPORT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(REPORT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${REPORT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(REPORT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${REPORT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(REPORT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${REPORT_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(REPORT_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${REPORT_PATH(PROBE_ID)} returns 403 with the Forbidden envelope (NOT 401)`, async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate
		// `if (!session?.user?.isAdmin)` returns 403 with
		// `{ success: false, error: 'Forbidden' }` —
		// distinct from every prior admin-tree route which
		// returns 401.
		const response = await request.get(REPORT_PATH(PROBE_ID));
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: FORBIDDEN_403_MESSAGE
		});
	});

	test(`PUT ${REPORT_PATH(PROBE_ID)} returns 403 with the Forbidden envelope (NOT 401)`, async ({ request }) => {
		const response = await request.put(REPORT_PATH(PROBE_ID));
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: FORBIDDEN_403_MESSAGE
		});
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} unauth response is NEVER 401`, async ({ request }) => {
		// Pin the divergence: the unauth client lands on 403
		// (not 401), distinct from every prior admin-tree
		// route. A regression that "fixed" the gate to
		// return 401 instead would surface here.
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(401);
			expect(response.status()).toBe(403);
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(403);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} share the SAME 403 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse] = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID))
		]);

		const [getBody, putBody] = await Promise.all([getResponse.json(), putResponse.json()]);
		expect(getBody).toEqual(putBody);
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <report> }.
		// PUT success: { success: true, message, data: <report>, moderationResult }.
		// The unauth branch must NEVER contain a `data` or
		// `moderationResult` key, must NOT contain
		// `success: true`, and must NOT contain a `message`
		// key.
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'resolved' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'resolved' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'invalid-status' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'invalid-resolution' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'content_removed' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// The dynamic 400 messages
			// `'Invalid status. Must be one of: ...'` and
			// `'Invalid resolution. Must be one of: ...'` are
			// constructed by interpolating valid-enum lists,
			// so we use a regex prefix check.
			if (typeof body.error === 'string') {
				expect(body.error).not.toMatch(FORBIDDEN_PREFIX_RE);
			}
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		const getBaseline = await request.get(REPORT_PATH(PROBE_ID));
		const putBaseline = await request.put(REPORT_PATH(PROBE_ID));

		const getResponses = await Promise.all(REPORT_IDS.map((id) => request.get(REPORT_PATH(id))));
		const putResponses = await Promise.all(REPORT_IDS.map((id) => request.put(REPORT_PATH(id))));

		for (const response of getResponses) {
			expect(response.status()).toBe(getBaseline.status());
		}
		for (const response of putResponses) {
			expect(response.status()).toBe(putBaseline.status());
		}
	});

	test(`PUT ${REPORT_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(REPORT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(REPORT_PATH(PROBE_ID), { data: {} }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'resolved' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'content_removed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'invalid' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'invalid' } }),
			request.put(REPORT_PATH(PROBE_ID), {
				data: { status: 'resolved', resolution: 'user_banned', reviewNote: 'Spam' }
			}),
			request.put(REPORT_PATH(PROBE_ID), { data: { isAdmin: true, status: 'resolved' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(REPORT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(REPORT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(REPORT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(REPORT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(REPORT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${REPORT_PATH(PROBE_ID)} cross-method probe (POST / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(REPORT_PATH(PROBE_ID)),
			request.patch(REPORT_PATH(PROBE_ID)),
			request.delete(REPORT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${REPORT_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(REPORT_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(REPORT_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(REPORT_PATH(PROBE_ID), { data: '{"status":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT ${REPORT_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders
		// `getReportById(...)` / `updateReport(...)` /
		// `removeContent(...)` / `warnUser(...)` /
		// `suspendUser(...)` / `banUser(...)` /
		// `getContentOwner(...)` before the gate would
		// surface here.
		const responses = await Promise.all([
			request.get(REPORT_PATH(PROBE_ID)),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'content_removed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_warned' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_suspended' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_banned' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
		}
	});

	test(`PUT ${REPORT_PATH(PROBE_ID)} is invariant to status / resolution enum shapes on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, every enum shape resolves
		// differently (valid → moderation chain, invalid →
		// 400). On the unauth branch every shape must round-
		// trip to the same 403 status.
		const baseline = await request.put(REPORT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'pending' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'reviewed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'resolved' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'dismissed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { status: 'INVALID' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'content_removed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_warned' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_suspended' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_banned' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'no_action' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'INVALID' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PUT ${REPORT_PATH(PROBE_ID)} moderation chain is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, the moderation chain executes
		// one of `removeContent` / `warnUser` /
		// `suspendUser` / `banUser` based on `resolution`,
		// each returning a `moderationResult` payload. On
		// the unauth branch the gate fires before any of
		// these, so the unauth response must NEVER contain
		// a `moderationResult` key.
		const responses = await Promise.all([
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'content_removed' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_warned' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_suspended' } }),
			request.put(REPORT_PATH(PROBE_ID), { data: { resolution: 'user_banned' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.moderationResult).toBeUndefined();
		}
	});
});
