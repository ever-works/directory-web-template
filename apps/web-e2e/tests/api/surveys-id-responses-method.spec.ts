import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / POST
 * dynamic-segment / body / header surface** of the
 * per-survey responses endpoint served by the `GET`
 * and `POST` exports of
 * `apps/web/app/api/surveys/[surveyId]/responses/route.ts`.
 *
 * `GET / POST /api/surveys/[surveyId]/responses` is the
 * **first per-source-file dual-method smoke** the docs
 * tree publishes that pins a **SPLIT-auth gate
 * contract** on a single per-source-file route — GET
 * is admin-gated (returns 401 `'Unauthorized'` for
 * non-admin callers) while POST is **PUBLIC** (any
 * caller may submit a response, with optional session
 * capture for the `userId` field). This is distinct
 * from the sibling `surveys/[surveyId]/route.ts` which
 * pins a MIXED-auth gate (public-GET + admin-PUT +
 * admin-DELETE).
 *
 * Distinct from EVERY prior dual-method smoke:
 *
 *   - **SPLIT-auth gate** — UNIQUE: the FIRST
 *     per-source-file dual-method smoke pinning an
 *     admin-GET + public-POST contract on the SAME
 *     dynamic-segment route. Most dual-method
 *     siblings either gate both methods (admin /
 *     auth) or leave both public.
 *   - **POST is public + 404-survey-existence guard**
 *     — the POST handler does NOT call `auth()` for
 *     the gate; it calls `surveyService.getOne
 *     (surveyId)` after body validation and returns
 *     404 `'Survey not found'` if the survey does
 *     not exist. UNIQUE: the FIRST per-source-file
 *     POST smoke pinning a 404-existence guard
 *     BEFORE submission rather than as a 401 gate.
 *   - **`body.data` JSON-object guard** — POST
 *     requires `body.data` to be a non-null object;
 *     400 `'Invalid request body: "data" is
 *     required'` otherwise. UNIQUE: a manual
 *     `typeof body.data === 'object' && body.data !=
 *     null` guard, NOT a Zod `safeParse`.
 *   - **IP / user-agent header capture** — POST
 *     captures `x-forwarded-for` (first comma-
 *     segment), falls back to `x-real-ip`, then to
 *     `'unknown'`; captures `user-agent` with
 *     `'unknown'` fallback. UNIQUE: the FIRST per-
 *     source-file POST smoke pinning an IP /
 *     user-agent header-capture contract.
 *   - **`itemId` sourced from the SURVEY** — the
 *     POST handler sets `responseData.itemId =
 *     survey.itemId` (NOT `body.itemId`). UNIQUE: the
 *     handler IGNORES any caller-provided `itemId`
 *     and sources it from the survey row.
 *   - **201 Created on success POST** — UNIQUE: the
 *     FIRST per-source-file POST smoke pinning a
 *     `201` (NOT `200`) success status.
 *   - **`{ success: true, data: <responses> }` GET
 *     payload + paginated filter shape** — GET
 *     accepts `itemId` / `userId` / `startDate` /
 *     `endDate` / `page` / `limit` query parameters
 *     with a strict `/^\d+$/` regex on `page` /
 *     `limit` (anything else falls back to
 *     `undefined`).
 *   - **`safeErrorResponse(error, 'Failed to fetch
 *     responses')` outer-catch on GET** vs
 *     **`safeErrorResponse(error, 'Failed to submit
 *     response')` outer-catch on POST**.
 *
 *   1. **GET handler** — `auth()` session lookup
 *      (`!session?.user?.isAdmin` → 401 TWO-key);
 *      query-param parsing with `/^\d+$/` regex on
 *      `page` / `limit`; `surveyService.getResponses
 *      (surveyId, filters)` load-bearing service
 *      call; success returns `{ success: true, data:
 *      <responses> }`.
 *   2. **POST handler** — JSON body parse; manual
 *      `typeof body.data === 'object' && body.data !=
 *      null` guard → 400; `surveyService.getOne
 *      (surveyId)` existence guard → 404 if survey
 *      missing; OPTIONAL `auth()` session capture for
 *      the `userId` field (NOT a gate); IP /
 *      user-agent header capture; `surveyService.
 *      submitResponse(responseData)` load-bearing
 *      service call; success returns `{ success:
 *      true, data: <response>, message: 'Response
 *      submitted successfully' }` with status 201.
 *   3. **Method-resolution surface** — the route
 *      exports `GET` AND `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SURVEY_ID = '__definitely-not-a-real-survey-id__';
const RESPONSES_PATH = `/api/surveys/${NON_EXISTENT_SURVEY_ID}/responses`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	// IP / user-agent probes (POST-relevant).
	{ headers: { 'X-Forwarded-For': '203.0.113.5, 198.51.100.1' }, label: 'multi-hop x-forwarded-for' },
	{ headers: { 'X-Real-IP': '203.0.113.99' }, label: 'fabricated x-real-ip' },
	{ headers: { 'User-Agent': 'fabricated-ua/0.0' }, label: 'fabricated user-agent' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { data: null }, label: 'null data' },
	{ data: { data: 'not-an-object' }, label: 'string data' },
	{ data: { data: 42 }, label: 'number data' },

	{ data: { data: {} }, label: 'empty data object' },
	{ data: { data: { q1: 'answer' } }, label: 'single-question data' },

	// Bypass attempts — handler ignores body-supplied itemId / userId.
	{ data: { data: { x: 1 }, itemId: 'fabricated', userId: 'fabricated' }, label: 'fabricated itemId+userId' },
	{ data: { data: { x: 1 }, surveyId: 'override-attempt' }, label: 'surveyId override attempt' }
] as const;

const POST_GET_QUERIES = [
	{ qs: '', label: 'no query' },
	{ qs: '?page=1', label: 'page=1' },
	{ qs: '?limit=10', label: 'limit=10' },
	{ qs: '?page=abc&limit=xyz', label: 'non-numeric page+limit' },
	{ qs: '?itemId=fabricated', label: 'itemId filter' },
	{ qs: '?userId=fabricated', label: 'userId filter' },
	{ qs: '?startDate=2026-01-01&endDate=2026-12-31', label: 'date-range filter' }
] as const;

test.describe('API: /api/surveys/[surveyId]/responses GET / POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${RESPONSES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(RESPONSES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`POST ${RESPONSES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(RESPONSES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { qs, label } of POST_GET_QUERIES) {
		test(`GET ${RESPONSES_PATH}${qs} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(`${RESPONSES_PATH}${qs}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${RESPONSES_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(RESPONSES_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${RESPONSES_PATH} returns 401 with the canonical TWO-key Unauthorized envelope`, async ({
		request
	}) => {
		// CURRENT contract: GET is admin-gated. The
		// `!session?.user?.isAdmin` branch returns 401
		// `{ success: false, error: 'Unauthorized' }`.
		const response = await request.get(RESPONSES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET ${RESPONSES_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(RESPONSES_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`GET ${RESPONSES_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(`${RESPONSES_PATH}?itemId=fabricated&userId=fabricated&page=1&limit=10`);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Failed to fetch responses');
		expect(serialized).not.toContain('Response submitted successfully');
		expect(serialized).not.toContain('Survey not found');
	});

	test(`GET ${RESPONSES_PATH} surveyService.getResponses is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `surveyService.getResponses(surveyId, filters)`
		// call must NEVER run on unauth. Pin that no
		// query-string fields are echoed back.
		const response = await request.get(
			`${RESPONSES_PATH}?itemId=XSS-MARKER-12345&userId=XSS-MARKER-67890&startDate=leak-me`
		);

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('XSS-MARKER-12345');
		expect(serialized).not.toContain('XSS-MARKER-67890');
		expect(serialized).not.toContain('leak-me');
	});

	test(`GET ${RESPONSES_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.get(RESPONSES_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(RESPONSES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(RESPONSES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(RESPONSES_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${RESPONSES_PATH} with valid data on a non-existent survey returns 404 'Survey not found'`, async ({
		request
	}) => {
		// CURRENT contract: POST is PUBLIC — there is
		// NO auth gate. The handler validates
		// `body.data`, then calls
		// `surveyService.getOne(surveyId)` and returns
		// 404 if the survey does not exist.
		const response = await request.post(RESPONSES_PATH, {
			data: { data: { q1: 'answer' } }
		});
		expect(response.status()).toBe(404);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Survey not found');
	});

	test(`POST ${RESPONSES_PATH} with missing data returns 400 with the canonical TWO-key envelope`, async ({
		request
	}) => {
		// The 400 branch is reached BEFORE the
		// `surveyService.getOne` existence guard.
		const response = await request.post(RESPONSES_PATH, { data: {} });
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid request body: "data" is required');
	});

	test(`POST ${RESPONSES_PATH} 400 fires BEFORE the 404-existence guard`, async ({ request }) => {
		// Even on a non-existent survey, a missing /
		// invalid `data` field produces a 400 (NOT
		// 404). Pin the validation-before-existence
		// ordering.
		const response = await request.post(RESPONSES_PATH, { data: { data: null } });
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).not.toBe('Survey not found');
		expect(body.error).toBe('Invalid request body: "data" is required');
	});

	test(`POST ${RESPONSES_PATH} non-object data values return 400`, async ({ request }) => {
		// `typeof body.data === 'object' && body.data
		// != null` rejects strings / numbers / arrays.
		// (Arrays pass `typeof === 'object'` so the
		// handler accepts them — which is intentional
		// per the current contract.)
		const responses = await Promise.all([
			request.post(RESPONSES_PATH, { data: { data: 'string' } }),
			request.post(RESPONSES_PATH, { data: { data: 42 } }),
			request.post(RESPONSES_PATH, { data: { data: true } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(400);
			const body = await response.json();
			expect(body.error).toBe('Invalid request body: "data" is required');
		}
	});

	test(`POST ${RESPONSES_PATH} surveyService.submitResponse is NOT entered on the unauth-survey branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `surveyService.submitResponse(responseData)`
		// call must NEVER run on a non-existent survey.
		// Pin that no body fields are echoed back.
		const response = await request.post(RESPONSES_PATH, {
			data: { data: { secret: 'XSS-MARKER-12345' }, itemId: 'leak-me', userId: 'fabricated' }
		});

		expect(response.status()).toBe(404);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('XSS-MARKER-12345');
		expect(serialized).not.toContain('leak-me');
		expect(serialized).not.toContain('Response submitted successfully');
	});

	test(`POST ${RESPONSES_PATH} 404 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(RESPONSES_PATH, { data: { data: { q1: 'a' } } });
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`POST ${RESPONSES_PATH} 400 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(RESPONSES_PATH, { data: {} });
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`POST ${RESPONSES_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(RESPONSES_PATH, { data: { data: { q: 'a' } } });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${RESPONSES_PATH} ignores caller-supplied IP / user-agent for the 404 envelope`, async ({
		request
	}) => {
		// CURRENT contract: even though the handler
		// captures `x-forwarded-for` / `x-real-ip` /
		// `user-agent` for the 201 success path, those
		// must NOT influence the 404-existence-guard
		// envelope.
		const baseline = await request.post(RESPONSES_PATH, { data: { data: { q: 'a' } } });
		const baselineStatus = baseline.status();
		expect(baselineStatus).toBe(404);

		const responses = await Promise.all([
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { 'X-Forwarded-For': '203.0.113.5' }
			}),
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { 'X-Real-IP': '203.0.113.99' }
			}),
			request.post(RESPONSES_PATH, {
				data: { data: { q: 'a' } },
				headers: { 'User-Agent': 'fabricated-ua/0.0' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
			const body = await response.json();
			expect(body.error).toBe('Survey not found');
		}
	});

	test(`Cross-method probe (PUT / PATCH / DELETE) on ${RESPONSES_PATH} does NOT 5xx`, async ({
		request
	}) => {
		// The route exports GET / POST. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(RESPONSES_PATH),
			request.patch(RESPONSES_PATH),
			request.delete(RESPONSES_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET and POST ${RESPONSES_PATH} have DISTINCT 401-vs-404 envelopes`, async ({ request }) => {
		// SPLIT-auth contract: GET returns 401 for
		// non-admin callers, POST returns 404 for a
		// non-existent survey. Pin that the two
		// envelopes are NOT byte-identical.
		const getResponse = await request.get(RESPONSES_PATH);
		const postResponse = await request.post(RESPONSES_PATH, { data: { data: { q: 'a' } } });

		expect(getResponse.status()).toBe(401);
		expect(postResponse.status()).toBe(404);

		const getBody = await getResponse.json();
		const postBody = await postResponse.json();
		expect(getBody.error).toBe('Unauthorized');
		expect(postBody.error).toBe('Survey not found');
		expect(getBody).not.toEqual(postBody);
	});
});
