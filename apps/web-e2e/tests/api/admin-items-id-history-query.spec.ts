import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **HTTP-method / query-param /
 * dynamic-segment / header surface** of the admin-only
 * item-audit-history endpoint served by
 * `apps/web/app/api/admin/items/[id]/history/route.ts`.
 *
 * `GET /api/admin/items/[id]/history` is the **first**
 * admin-tree route the smoke layer covers that combines a
 * **dynamic-segment `[id]` `GET` handler** with **all
 * four** of (a) an `auth()` gate, (b) a 404 item-existence
 * branch, (c) a query-param surface, and (d) a per-key
 * enum-validation 400 branch. It documents the unique
 * combination of:
 *
 *   1. **Dynamic-segment `GET` handler** — distinct from
 *      the dynamic-segment `POST` route covered by
 *      `admin-items-id-review-body.spec.ts`.
 *   2. **Single-step `auth()` chain** with the canonical
 *      longer envelope.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'`.
 *   4. **`success: false` envelope key** on the 401 branch.
 *   5. **Item-existence check via `itemRepository.findById(itemId, true)`
 *      AFTER the gate AND AFTER `await params`** — the
 *      first admin-tree route the smoke layer covers
 *      that has a 404 item-existence branch between the
 *      gate and the query-param parse, with the 404
 *      envelope `{ success: false, error: 'Item not found' }`.
 *   6. **Query params parsed AFTER the existence check** —
 *      `searchParams.get('page')` / `searchParams.get('limit')` /
 *      `searchParams.get('action')` are all read AFTER
 *      the 404 branch.
 *   7. **`page` clamping** via
 *      `Number.isNaN(rawPage) ? 1 : Math.max(1, rawPage)`
 *      — defaults to 1, clamps to >= 1. NaN-safe.
 *   8. **`limit` clamping** via
 *      `Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))`
 *      — defaults to 20, clamps to 1..100.
 *   9. **`action` enum-validation 400 branch** with a
 *      dynamically-interpolated message
 *      `Invalid action filter(s): <bad>. Valid actions are: <list>`.
 *      The unauth branch must NEVER reach the validation,
 *      so the unauth response body must NOT match the
 *      `/^Invalid action filter\(s\):/` regex prefix nor
 *      contain any of the six valid action names.
 *  10. **`itemAuditService.getHistory(...)` call** AFTER
 *      all four gates, with success-branch payload
 *      `{ success: true, data: { logs, total, page, limit, totalPages } }`.
 *  11. **`safeErrorResponse(error, 'Failed to fetch item history')`
 *      catch** — matching the `admin/items/[id]/review`
 *      catch family.
 *  12. **Method-resolution surface** — `GET`-only export.
 *
 * Where the immediately-preceding
 * `admin-clients-bulk-method.spec.ts` walks a static-path
 * dual-method route with a single-step gate and the bare
 * envelope, this spec walks a dynamic-segment single-method
 * `GET` route with a single-step gate, the canonical
 * longer envelope, AND a 404 item-existence branch — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const BASE_PATH = '/api/admin/items';
const HISTORY_SUFFIX = '/history';
const BASELINE_ID = 'awesome-productivity-tool';
const BASELINE_PATH = `${BASE_PATH}/${BASELINE_ID}${HISTORY_SUFFIX}`;

const VALID_ACTIONS = ['created', 'updated', 'status_changed', 'reviewed', 'deleted', 'restored'] as const;

const ADMIN_ITEMS_HISTORY_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const ADMIN_ITEMS_HISTORY_QUERIES = [
	{ qs: '', label: 'no query string' },
	{ qs: '?page=1', label: 'page=1' },
	{ qs: '?page=0', label: 'page=0 (clamped to 1)' },
	{ qs: '?page=-5', label: 'page=-5 (clamped to 1)' },
	{ qs: '?page=999999', label: 'page=999999' },
	{ qs: '?page=NaN', label: 'page=NaN (default 1)' },
	{ qs: '?page=abc', label: 'page=abc (default 1)' },
	{ qs: '?limit=1', label: 'limit=1' },
	{ qs: '?limit=20', label: 'limit=20 (default)' },
	{ qs: '?limit=100', label: 'limit=100 (max)' },
	{ qs: '?limit=999', label: 'limit=999 (clamped to 100)' },
	{ qs: '?limit=-5', label: 'limit=-5 (clamped to 1)' },
	{ qs: '?limit=NaN', label: 'limit=NaN (default 20)' },
	{ qs: '?action=created', label: 'action=created' },
	{ qs: '?action=updated,reviewed', label: 'action=updated,reviewed' },
	{ qs: `?action=${VALID_ACTIONS.join(',')}`, label: 'action=all-valid' },
	{ qs: '?action=invalid', label: 'action=invalid (would 400 if reachable)' },
	{ qs: '?action=', label: 'empty action (truthy guard skips validation)' },
	{ qs: '?action=,,,', label: 'comma-only action (would 400 if reachable)' },
	{ qs: '?action=created,invalid', label: 'mixed-valid+invalid action (would 400 if reachable)' },
	{ qs: "?action=' OR 1=1", label: 'sql-injection-shape action (would 400 if reachable)' },
	{ qs: '?action=<script>alert(1)</script>', label: 'xss-shape action (would 400 if reachable)' },
	{ qs: '?page=1&limit=20&action=created', label: 'page+limit+action combo' },
	{ qs: '?userId=admin', label: 'fabricated userId query' },
	{ qs: '?token=anything', label: 'fabricated token query' },
	{ qs: '?bypass=1', label: 'fabricated bypass query' },
	{ qs: '?isAdmin=true', label: 'fabricated isAdmin query' },
	{ qs: '?limit=1&limit=999', label: 'repeated-key limit' },
	{ qs: '?page=1&page=2', label: 'repeated-key page' },
	{ qs: '?action=created&action=invalid', label: 'repeated-key action' }
] as const;

const ADMIN_ITEMS_HISTORY_DYNAMIC_IDS = [
	BASELINE_ID,
	'123',
	'0',
	'a'.repeat(200),
	'item-with-dashes',
	'item_with_underscores',
	'item.with.dots',
	'%E4%B8%AD%E6%96%87', // url-encoded Chinese characters
	'%20',                // url-encoded space
	'soft-deleted-item-shape'
] as const;

const VALIDATION_400_PREFIX = 'Invalid action filter(s):';
const NOT_FOUND_404_MESSAGE = 'Item not found';
const CATCH_500_MESSAGE = 'Failed to fetch item history';
const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/items/[id]/history method / query / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_HISTORY_HEADERS) {
		test(`GET ${BASELINE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(BASELINE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { qs, label } of ADMIN_ITEMS_HISTORY_QUERIES) {
		test(`GET ${BASELINE_PATH}${qs} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(`${BASELINE_PATH}${qs}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const id of ADMIN_ITEMS_HISTORY_DYNAMIC_IDS) {
		test(`GET ${BASE_PATH}/${id}${HISTORY_SUFFIX} (dynamic id shape) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(`${BASE_PATH}/${id}${HISTORY_SUFFIX}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${BASELINE_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the canonical longer envelope
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.get(BASELINE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET ${BASELINE_PATH} does NOT echo the 404 Item-not-found envelope on the unauth branch`, async ({
		request
	}) => {
		// The 404 branch returns
		// `{ success: false, error: 'Item not found' }` AFTER
		// the gate AND AFTER `await params`. The unauth
		// branch fires the gate BEFORE the existence check,
		// so the unauth response must NEVER contain the 404
		// message. A regression that re-orders the existence
		// check before the gate would surface here.
		const responses = await Promise.all([
			request.get(`${BASE_PATH}/nonexistent-item${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/0${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/${'a'.repeat(200)}${HISTORY_SUFFIX}`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe(NOT_FOUND_404_MESSAGE);
		}
	});

	test(`GET ${BASELINE_PATH} does NOT echo the action-enum 400 message on the unauth branch`, async ({ request }) => {
		// The 400 envelope for the action-enum validation is
		// the dynamic
		// `'Invalid action filter(s): <bad>. Valid actions are: <list>'`
		// message. The unauth branch fires the gate BEFORE
		// the query-param parse, so the unauth response must
		// NEVER contain the 400 prefix. A regression that
		// re-orders the enum validation before the gate
		// would surface here.
		const probes = [
			'?action=invalid',
			'?action=,,,',
			'?action=created,invalid',
			"?action=' OR 1=1",
			'?action=<script>alert(1)</script>'
		];

		for (const qs of probes) {
			const response = await request.get(`${BASELINE_PATH}${qs}`);
			const body = await response.json();
			expect(typeof body.error === 'string' && body.error.startsWith(VALIDATION_400_PREFIX)).toBe(false);
		}
	});

	test(`GET ${BASELINE_PATH} does NOT echo any of the six valid action names on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the enum-list interpolation
		// before the gate would surface here: the
		// `Valid actions are: created, updated, status_changed, reviewed, deleted, restored`
		// suffix would land in the unauth response body.
		const response = await request.get(`${BASELINE_PATH}?action=invalid`);
		const body = await response.json();
		const errorString = typeof body.error === 'string' ? body.error : '';

		for (const action of VALID_ACTIONS) {
			// Use a word-boundary regex to avoid false matches on substrings.
			expect(new RegExp(`\\b${action}\\b`).test(errorString)).toBe(false);
		}
	});

	test(`GET ${BASELINE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, data: { logs, total, page, limit, totalPages } }`.
		// The unauth branch must NEVER reach the
		// `itemAuditService.getHistory(...)` call, so the
		// response body must NOT contain `data.logs` /
		// `data.total` / `data.totalPages` keys and must
		// NOT contain `success: true`.
		const response = await request.get(BASELINE_PATH);
		const body = await response.json();
		expect(body.success).not.toBe(true);
		expect(body.data).toBeUndefined();
	});

	test(`GET ${BASELINE_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({ request }) => {
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to fetch item history')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to fetch item history'` message. A
		// regression that swaps the gate for a try-catch
		// wrapper that swallows auth failures would surface
		// here.
		const response = await request.get(BASELINE_PATH);
		const body = await response.json();
		expect(body.error).not.toBe(CATCH_500_MESSAGE);
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});

	test(`GET ${BASELINE_PATH} has a stable status across header / query / id permutations`, async ({ request }) => {
		// The single-step gate fires before the existence
		// check AND before the query parse, so every
		// permutation must round-trip to the same 401 status
		// as the no-arg baseline.
		const baseline = await request.get(BASELINE_PATH);
		const responses = await Promise.all([
			request.get(`${BASELINE_PATH}?page=1&limit=20`),
			request.get(`${BASELINE_PATH}?action=created,updated`),
			request.get(`${BASELINE_PATH}?action=invalid`),
			request.get(`${BASE_PATH}/different-id${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/0${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/${'a'.repeat(200)}${HISTORY_SUFFIX}`),
			request.get(BASELINE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(BASELINE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${BASELINE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.get(BASELINE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(BASELINE_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.get(BASELINE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.get(BASELINE_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.get(BASELINE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(BASELINE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(BASELINE_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.get(BASELINE_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.get(BASELINE_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${BASELINE_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route only exports `GET`. Every other method
		// (POST / PUT / PATCH / DELETE) must round-trip to
		// a `< 500` status (typically 405 Method Not Allowed).
		const responses = await Promise.all([
			request.post(BASELINE_PATH),
			request.put(BASELINE_PATH),
			request.patch(BASELINE_PATH),
			request.delete(BASELINE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${BASELINE_PATH} Unauthorized error envelope echoes the success: false key`, async ({ request }) => {
		// Strict envelope-shape assertion: the canonical
		// longer envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// The presence of the `success: false` key is the
		// cross-route divergence that distinguishes this
		// route's gate from the bare-message gates.
		const response = await request.get(BASELINE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`GET ${BASELINE_PATH} is invariant to dynamic [id] segment shape on the unauth branch`, async ({ request }) => {
		// The handler signature is
		// `GET(request, { params }: { params: Promise<{ id: string }> })`.
		// `params` is awaited AFTER the gate AND AFTER the
		// existence check, so the unauth branch must NEVER
		// reach the `await params` step. A regression that
		// re-orders `await params` before the gate would
		// surface as a status divergence between the
		// baseline UUID and the alternate id shapes.
		const baseline = await request.get(BASELINE_PATH);
		const responses = await Promise.all([
			request.get(`${BASE_PATH}/123${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/0${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/${'a'.repeat(200)}${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/item-with-dashes${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/item_with_underscores${HISTORY_SUFFIX}`),
			request.get(`${BASE_PATH}/%E4%B8%AD%E6%96%87${HISTORY_SUFFIX}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${BASELINE_PATH} is invariant to limit / page / action repeats on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the query parse before the
		// gate would surface here: repeated keys would
		// resolve to the LAST value (per URLSearchParams
		// semantics) and trigger different downstream
		// branches. The unauth branch must round-trip to
		// the same 401 status regardless of repeat-count.
		const baseline = await request.get(BASELINE_PATH);
		const responses = await Promise.all([
			request.get(`${BASELINE_PATH}?limit=1&limit=999`),
			request.get(`${BASELINE_PATH}?page=1&page=2`),
			request.get(`${BASELINE_PATH}?action=created&action=invalid`),
			request.get(`${BASELINE_PATH}?action=invalid&action=created`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${BASELINE_PATH} is invariant to action-enum boundary fuzzing on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the enum validation before
		// the gate would surface here: SQL-injection-shape
		// and XSS-shape probes would 400 with the dynamic
		// `'Invalid action filter(s): ...'` message instead
		// of 401 with the canonical longer envelope.
		const baseline = await request.get(BASELINE_PATH);
		const responses = await Promise.all([
			request.get(`${BASELINE_PATH}?action=`),
			request.get(`${BASELINE_PATH}?action=,,,`),
			request.get(`${BASELINE_PATH}?action=created,invalid`),
			request.get(`${BASELINE_PATH}?action=' OR 1=1`),
			request.get(`${BASELINE_PATH}?action=<script>alert(1)</script>`),
			request.get(`${BASELINE_PATH}?action=${encodeURIComponent('null\x00bytes')}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
