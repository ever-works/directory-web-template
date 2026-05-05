import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / PUT / DELETE
 * dynamic-segment / body / header surface** of the
 * per-survey detail endpoint served by the `GET`,
 * `PUT`, and `DELETE` exports of
 * `apps/web/app/api/surveys/[surveyId]/route.ts`.
 *
 * `GET / PUT / DELETE /api/surveys/[surveyId]` is the
 * **first per-source-file triple-method smoke** the
 * docs tree publishes that pins a **MIXED-auth gate
 * contract** — GET is publicly accessible for
 * **published** surveys but admin-gated for
 * unpublished surveys (with a UNIQUE **404-mask**:
 * non-admin callers see `404 'Survey not found'`
 * INSTEAD of `403 'Forbidden'`); PUT and DELETE are
 * admin-only.
 *
 * Distinct from EVERY prior triple-method smoke:
 *
 *   - **MIXED-auth gate** — the FIRST per-source-file
 *     triple-method smoke pinning a public-GET +
 *     admin-PUT + admin-DELETE pattern (vs admin-
 *     collections-[id] which is admin-gated on ALL
 *     three methods).
 *   - **404-mask on GET for non-published surveys**
 *     — non-admin callers see `404 'Survey not found'`
 *     for both not-found-at-all AND not-published-
 *     and-not-admin (UNIQUE: the FIRST per-source-
 *     file GET smoke pinning a 404-mask security
 *     pattern that hides the existence of
 *     unpublished resources from non-admins).
 *   - **ID-or-slug fallback lookup** — the handler
 *     tries `surveyService.getOne(surveyId)` first
 *     then falls back to `surveyService.getBySlug
 *     (surveyId)` (UNIQUE: the FIRST per-source-file
 *     dynamic-segment GET smoke pinning a dual-
 *     lookup-by-id-or-slug contract).
 *   - **`error.message === 'Survey not found'`
 *     catch-branch dispatch** on PUT and DELETE —
 *     the catch dispatches on the thrown `Error.
 *     message` string and re-emits `404 'Survey not
 *     found'` (UNIQUE: the FIRST per-source-file
 *     PUT/DELETE smoke pinning an `Error.message`
 *     equality-match catch-dispatcher).
 *   - **TWO-key `{ success: false, error:
 *     'Unauthorized' }` 401 envelope on PUT and
 *     DELETE** (vs the bare ONE-key envelope of
 *     other admin routes).
 *   - **`data: null` in DELETE success payload** —
 *     the DELETE 200 response includes `data: null`
 *     (UNUSUAL: most DELETE handlers omit `data` or
 *     return `data: { ... }` with details).
 *
 *   1. **GET handler** — `surveyService.getOne(surveyId)`
 *      → fallback to `surveyService.getBySlug(surveyId)`;
 *      404 if both null; `auth()` gate AFTER the
 *      lookup — only for non-published surveys; 404-
 *      mask if `!session?.user?.isAdmin` and survey
 *      is not published; success payload `{ success:
 *      true, data: <survey> }`.
 *   2. **PUT handler** — `auth()` session lookup
 *      (`!session?.user?.isAdmin` → 401 TWO-key); JSON
 *      body parse; ID-or-slug fallback lookup; 404 if
 *      both null; `surveyService.update(survey.id,
 *      body)`; success payload `{ success: true, data:
 *      <updatedSurvey>, message: 'Survey updated
 *      successfully' }`; outer catch with `Error.
 *      message === 'Survey not found'` → re-emit 404
 *      else `safeErrorResponse(error, 'Failed to
 *      update survey')`.
 *   3. **DELETE handler** — `auth()` session lookup
 *      (`!session?.user?.isAdmin` → 401 TWO-key);
 *      ID-or-slug fallback lookup; 404 if both null;
 *      `surveyService.delete(survey.id)`; success
 *      payload `{ success: true, data: null, message:
 *      'Survey deleted successfully' }`; same catch-
 *      dispatcher as PUT.
 *   4. **Method-resolution surface** — the route
 *      exports `GET`, `PUT`, AND `DELETE`. `POST` /
 *      `PATCH` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_SURVEY_ID = '__definitely-not-a-real-survey-id-or-slug__';
const SURVEY_PATH = `/api/surveys/${NON_EXISTENT_SURVEY_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	{ data: { title: 'fabricated title' }, label: 'title-only update' },
	{ data: { status: 'published' }, label: 'status update to published' },
	{ data: { status: 'closed' }, label: 'status update to closed' },
	{ data: { surveyJson: { pages: [] } }, label: 'surveyJson update' },

	// Bypass attempts.
	{ data: { isAdmin: true, status: 'published' }, label: 'isAdmin=true (handler ignores)' },
	{ data: { userId: 'fabricated', status: 'published' }, label: 'fabricated userId (handler ignores)' }
] as const;

test.describe('API: /api/surveys/[surveyId] GET / PUT / DELETE method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${SURVEY_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(SURVEY_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${SURVEY_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(SURVEY_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${SURVEY_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(SURVEY_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${SURVEY_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(SURVEY_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${SURVEY_PATH} with non-existent ID returns 404 with the canonical TWO-key envelope`, async ({
		request
	}) => {
		// CURRENT contract: a non-existent id-or-slug
		// returns 404 `{ success: false, error: 'Survey
		// not found' }` (the same envelope the 404-mask
		// uses for unpublished surveys).
		const response = await request.get(SURVEY_PATH);
		expect(response.status()).toBe(404);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Survey not found');
	});

	test(`PUT ${SURVEY_PATH} returns 401 with the canonical TWO-key Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.put(SURVEY_PATH, { data: { title: 'x' } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`DELETE ${SURVEY_PATH} returns 401 with the canonical TWO-key Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.delete(SURVEY_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`PUT and DELETE ${SURVEY_PATH} have IDENTICAL 401 envelopes`, async ({ request }) => {
		const putResponse = await request.put(SURVEY_PATH, { data: { title: 'x' } });
		const deleteResponse = await request.delete(SURVEY_PATH);

		expect(putResponse.status()).toBe(401);
		expect(deleteResponse.status()).toBe(401);

		const putBody = await putResponse.json();
		const deleteBody = await deleteResponse.json();
		expect(putBody).toEqual(deleteBody);
	});

	test(`PUT ${SURVEY_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.put(SURVEY_PATH, { data: { title: 'x' } });
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`PUT ${SURVEY_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.put(SURVEY_PATH, { data: { title: 'fabricated', status: 'published' } });
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Survey not found');
		expect(serialized).not.toContain('Survey updated successfully');
		expect(serialized).not.toContain('Survey deleted successfully');
		expect(serialized).not.toContain('Failed to update survey');
		expect(serialized).not.toContain('Failed to delete survey');
	});

	test(`PUT ${SURVEY_PATH} surveyService.update is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `surveyService.update(survey.id, body)` call
		// must NEVER run on unauth. Pin that no input
		// fields are echoed back.
		const response = await request.put(SURVEY_PATH, {
			data: { title: 'XSS-MARKER-12345', status: 'published', surveyJson: { secret: 'leak-me' } }
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('XSS-MARKER-12345');
		expect(serialized).not.toContain('leak-me');
	});

	test(`DELETE ${SURVEY_PATH} surveyService.delete is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `surveyService.delete(survey.id)` call must
		// NEVER run on unauth.
		const response = await request.delete(SURVEY_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('Survey deleted successfully');
		expect(serialized).not.toContain('data');
	});

	test(`PUT ${SURVEY_PATH} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports GET / PUT / DELETE. POST /
		// PATCH must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(SURVEY_PATH),
			request.patch(SURVEY_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${SURVEY_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const baseline = await request.put(SURVEY_PATH, { data: { title: 'x' } });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.put(SURVEY_PATH, {
				data: { title: 'x' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.put(SURVEY_PATH, {
				data: { title: 'x' },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.put(SURVEY_PATH, {
				data: { title: 'x' },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`DELETE ${SURVEY_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const baseline = await request.delete(SURVEY_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.delete(SURVEY_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(SURVEY_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.delete(SURVEY_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`PUT ${SURVEY_PATH} catch-branch dispatcher 'Survey not found' is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The PUT catch-dispatcher uses `error.message
		// === 'Survey not found'` to re-emit a 404. Pin
		// that this dispatcher is NOT entered upstream
		// of the auth gate.
		const response = await request.put(SURVEY_PATH, { data: { title: 'x' } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).not.toBe('Survey not found');
		expect(body.error).toBe('Unauthorized');
	});
});
