import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **dynamic-segment / header
 * surface** of the per-response detail endpoint
 * served by the `GET` export of
 * `apps/web/app/api/surveys/responses/[responseId]/route.ts`.
 *
 * `GET /api/surveys/responses/[responseId]` is the
 * **first per-source-file GET smoke** the docs tree
 * publishes that pins an **admin-gated survey-
 * response-by-id lookup** delegating to
 * `surveyService.getResponseById(responseId)` with a
 * `404 'Response not found'` non-existence guard
 * AFTER the auth gate.
 *
 * Distinct from EVERY prior per-source-file GET smoke:
 *
 *   - **`auth() + isAdmin` gate BEFORE the lookup**
 *     — non-admin callers see 401 `'Unauthorized'`
 *     and the load-bearing
 *     `surveyService.getResponseById(responseId)`
 *     call is NEVER entered.
 *   - **Single-route GET-only export** — the route
 *     exports ONLY `GET`. POST / PUT / PATCH /
 *     DELETE must round-trip to `< 500`.
 *   - **`{ success: true, data: <response> }`
 *     success payload + `{ success: false, error:
 *     'Response not found' }` 404 envelope** —
 *     UNIQUE: this is the FIRST per-source-file GET
 *     smoke pinning a `Response not found` 404
 *     envelope (distinct from the sibling
 *     `surveys/[surveyId]` route which uses `Survey
 *     not found`).
 *   - **`safeErrorResponse(error, 'Failed to fetch
 *     response')` outer-catch** — UNIQUE: the FIRST
 *     per-source-file GET smoke pinning a
 *     `'Failed to fetch response'` 500-catch helper
 *     (vs `'Failed to fetch responses'` on the
 *     plural-collection sibling).
 *
 *   1. **GET handler** — `auth()` session lookup
 *      (`!session?.user?.isAdmin` → 401 TWO-key);
 *      `surveyService.getResponseById(responseId)`
 *      load-bearing service call; 404 if the result
 *      is null; success returns `{ success: true,
 *      data: <response> }`.
 *   2. **Method-resolution surface** — the route
 *      exports ONLY `GET`. POST / PUT / PATCH /
 *      DELETE must round-trip to a `< 500` status.
 */
const NON_EXISTENT_RESPONSE_ID = '__definitely-not-a-real-response-id__';
const RESPONSE_PATH = `/api/surveys/responses/${NON_EXISTENT_RESPONSE_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Admin': 'true' }, label: 'fabricated X-Admin header' }
] as const;

test.describe('API: /api/surveys/responses/[responseId] GET method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${RESPONSE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(RESPONSE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${RESPONSE_PATH} returns 401 with the canonical TWO-key Unauthorized envelope`, async ({
		request
	}) => {
		// CURRENT contract: GET is admin-gated. The
		// `!session?.user?.isAdmin` branch returns 401
		// `{ success: false, error: 'Unauthorized' }`.
		const response = await request.get(RESPONSE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET ${RESPONSE_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(RESPONSE_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`GET ${RESPONSE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(RESPONSE_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Response not found');
		expect(serialized).not.toContain('Failed to fetch response');
	});

	test(`GET ${RESPONSE_PATH} surveyService.getResponseById is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `surveyService.getResponseById(responseId)`
		// call must NEVER run on unauth. Pin that
		// nothing leaks from the path-segment.
		const response = await request.get('/api/surveys/responses/XSS-MARKER-12345');
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('XSS-MARKER-12345');
	});

	test(`GET ${RESPONSE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.get(RESPONSE_PATH);
		const baselineStatus = baseline.status();
		expect(baselineStatus).toBe(401);

		const responses = await Promise.all([
			request.get(RESPONSE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(RESPONSE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(RESPONSE_PATH, { headers: { Authorization: 'Bearer fabricated' } }),
			request.get(RESPONSE_PATH, { headers: { 'X-Admin': 'true' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${RESPONSE_PATH} cross-permutation status invariance`, async ({ request }) => {
		// Every permutation of side-channel headers
		// collapses to a byte-identical 401 envelope.
		const baseline = await request.get(RESPONSE_PATH);
		const baselineBody = await baseline.json();

		const responses = await Promise.all(
			HEADERS.map(({ headers }) => request.get(RESPONSE_PATH, { headers }))
		);

		for (const response of responses) {
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`Cross-method probe (POST / PUT / PATCH / DELETE) on ${RESPONSE_PATH} does NOT 5xx`, async ({
		request
	}) => {
		// The route exports ONLY GET. POST / PUT /
		// PATCH / DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(RESPONSE_PATH),
			request.put(RESPONSE_PATH),
			request.patch(RESPONSE_PATH),
			request.delete(RESPONSE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${RESPONSE_PATH} catch-branch helper 'Failed to fetch response' is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// Pin that the
		// `safeErrorResponse(error, 'Failed to fetch
		// response')` outer-catch helper does NOT fire
		// on the unauth branch.
		const response = await request.get(RESPONSE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).not.toBe('Failed to fetch response');
		expect(body.error).toBe('Unauthorized');
	});
});
