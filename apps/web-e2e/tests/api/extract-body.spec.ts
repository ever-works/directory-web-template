import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the URL-extraction proxy endpoint served by the
 * `POST` export of `apps/web/app/api/extract/route.ts`.
 *
 * `POST /api/extract` is the **first non-admin-gated
 * POST smoke** the docs tree publishes that pins a
 * **"feature disabled" graceful-degradation branch**:
 * when `process.env.PLATFORM_API_URL` is missing, the
 * handler returns a 200 (NOT 401, NOT 503) with the
 * envelope `{ success: false, featureDisabled: true,
 * message: 'URL extraction feature is not available.
 * This feature requires PLATFORM_API_URL to be
 * configured.' }`. No prior smoke spec covers a
 * `featureDisabled: true` envelope shape.
 *
 * It is also the **first** POST smoke the docs tree
 * publishes that uses **Zod `safeParse` + `result.
 * error.issues[0].message`** (NOT `flatten()` like
 * other admin-tree POST smokes) to surface the FIRST
 * validation issue as the 400 envelope's `error` field.
 *
 *   1. **Feature-disabled gate** — `if
 *      (!platformApiUrl)` → 200 `{ success: false,
 *      featureDisabled: true, message: '<long
 *      message>' }`. NOTE: status 200, NOT a 4xx /
 *      5xx — the smoke spec pins this surprising
 *      status invariant.
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the feature-disabled gate.
 *   3. **Zod `safeParse` with single-issue surfacing**
 *      — `extractSchema.safeParse(body)` with
 *      `result.error.issues[0].message` → 400
 *      `{ success: false, error: '<first issue>' }`.
 *      Schema requires `url: z.string().url()` and
 *      optional `existingCategories: z.array
 *      (z.string())`.
 *   4. **External fetch proxy** — builds extraction
 *      endpoint URL by trimming trailing slashes
 *      (`platformApiUrl.replace(/\/+$/, '') +
 *      '/extract-item-details'`), POSTs to the
 *      Platform API with optional `Authorization:
 *      Bearer <PLATFORM_API_SECRET_TOKEN>` header.
 *      The request body is `{ source_url: url,
 *      existing_data: <undefined | non-empty
 *      array> }`.
 *   5. **Upstream-error pass-through** — `if
 *      (!response.ok)`: tries to parse upstream error
 *      JSON for `errorData.message`, falls back to
 *      `response.statusText`, then returns
 *      `{ success: false, error: <message> }` with
 *      the upstream status.
 *   6. **Success pass-through** — on 2xx upstream,
 *      returns the upstream payload verbatim
 *      (`return NextResponse.json(data)`).
 *   7. **Outer catch** — `console.error` + 500
 *      `{ success: false, error: 'Internal server
 *      error during extraction' }`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 *
 * In the e2e test environment `PLATFORM_API_URL` is
 * NOT configured, so EVERY POST request lands on the
 * feature-disabled branch and gets a 200 response
 * regardless of body shape. This makes the spec a
 * pinning of the feature-disabled envelope as the
 * load-bearing invariant — a regression that wired
 * up `PLATFORM_API_URL` for tests OR removed the
 * feature-disabled gate would surface here as a
 * status-code change OR a `featureDisabled` key
 * disappearance.
 */
const EXTRACT_PATH = '/api/extract';

const EXTRACT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Platform-Api-Url': 'fabricated' }, label: 'fabricated X-Platform-Api-Url header' }
] as const;

const EXTRACT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probes — would surface zod issues if reachable.
	{ data: { url: '' }, label: 'empty url string' },
	{ data: { url: 'not-a-url' }, label: 'invalid url format' },
	{ data: { existingCategories: ['X'] }, label: 'no url field' },

	// Valid bodies (would proxy to Platform API if reachable).
	{ data: { url: 'https://example.com/product' }, label: 'valid url only' },
	{
		data: { url: 'https://example.com/product', existingCategories: ['Productivity'] },
		label: 'valid url + existingCategories'
	},
	{
		data: { url: 'https://example.com/p', existingCategories: [] },
		label: 'valid url + empty existingCategories'
	},

	// Type-violation probes.
	{ data: { url: 123 }, label: 'numeric url' },
	{ data: { url: ['https://x.com'] }, label: 'array url' },
	{ data: { url: 'https://x.com', existingCategories: 'not-array' }, label: 'string existingCategories' },
	{ data: { url: 'https://x.com', existingCategories: [1, 2] }, label: 'numeric existingCategories items' },

	// Bypass attempts.
	{ data: { url: 'https://x.com', PLATFORM_API_URL: 'fabricated' }, label: 'PLATFORM_API_URL injection attempt' },
	{ data: { padding: 'x'.repeat(2_000), url: 'https://x.com' }, label: 'large padded body' }
] as const;

const FEATURE_DISABLED_MESSAGE =
	'URL extraction feature is not available. This feature requires PLATFORM_API_URL to be configured.';

test.describe('API: /api/extract POST body / header surface', () => {
	for (const { headers, label } of EXTRACT_HEADERS) {
		test(`POST ${EXTRACT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(EXTRACT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of EXTRACT_BODIES) {
		test(`POST ${EXTRACT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(EXTRACT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${EXTRACT_PATH} returns 200 with the feature-disabled envelope when PLATFORM_API_URL is not configured`, async ({
		request
	}) => {
		// In the e2e test environment, PLATFORM_API_URL
		// is not configured. The feature-disabled gate
		// fires BEFORE body parse, so EVERY POST lands
		// on this branch with a 200 status (NOT 401 /
		// NOT 4xx).
		const response = await request.post(EXTRACT_PATH);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			featureDisabled: true,
			message: FEATURE_DISABLED_MESSAGE
		});
	});

	test(`POST ${EXTRACT_PATH} envelope shape has exactly success / featureDisabled / message keys`, async ({
		request
	}) => {
		// Strict envelope-shape assertion: the feature-
		// disabled envelope is `{ success: false,
		// featureDisabled: true, message: '<long
		// message>' }`. No other keys must appear.
		const response = await request.post(EXTRACT_PATH);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['featureDisabled', 'message', 'success']);
		expect(body.success).toBe(false);
		expect(body.featureDisabled).toBe(true);
	});

	test(`POST ${EXTRACT_PATH} does NOT echo the validation-error or upstream-error fields on the feature-disabled branch`, async ({
		request
	}) => {
		// Validation branch returns `{ success: false,
		// error: '<zod issue>' }`. Upstream-error branch
		// returns `{ success: false, error: '<upstream
		// error>' }`. Feature-disabled branch must NEVER
		// echo an `error` key.
		const responses = await Promise.all([
			request.post(EXTRACT_PATH, { data: {} }),
			request.post(EXTRACT_PATH, { data: { url: 'not-a-url' } }),
			request.post(EXTRACT_PATH, { data: { url: 'https://example.com' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).toBeUndefined();
			expect(body.featureDisabled).toBe(true);
		}
	});

	test(`POST ${EXTRACT_PATH} does NOT echo any of the post-feature-disabled messages`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(EXTRACT_PATH),
			request.post(EXTRACT_PATH, { data: { url: 'not-a-url' } }),
			request.post(EXTRACT_PATH, { data: { url: 'https://example.com' } })
		]);

		const FORBIDDEN_MESSAGES = ['Invalid URL format', 'Failed to extract data from platform API', 'Internal server error during extraction'];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${EXTRACT_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(EXTRACT_PATH);
		const responses = await Promise.all([
			request.post(EXTRACT_PATH, { data: {} }),
			request.post(EXTRACT_PATH, { data: { url: 'https://example.com' } }),
			request.post(EXTRACT_PATH, { data: { url: 'not-a-url' } }),
			request.post(EXTRACT_PATH, { data: { PLATFORM_API_URL: 'fabricated', url: 'https://x.com' } }),
			request.post(EXTRACT_PATH, { headers: { 'X-Platform-Api-Url': 'fabricated' } }),
			request.post(EXTRACT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${EXTRACT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(EXTRACT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(EXTRACT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(EXTRACT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(EXTRACT_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(EXTRACT_PATH, { headers: { 'X-Platform-Api-Url': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${EXTRACT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(EXTRACT_PATH),
			request.put(EXTRACT_PATH),
			request.patch(EXTRACT_PATH),
			request.delete(EXTRACT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${EXTRACT_PATH} is invariant to malformed JSON bodies on the feature-disabled branch`, async ({
		request
	}) => {
		// The feature-disabled gate fires BEFORE body
		// parse, so malformed JSON bodies still land on
		// the same 200 envelope.
		const responses = await Promise.all([
			request.post(EXTRACT_PATH, { data: 'not-json' }),
			request.post(EXTRACT_PATH, { data: '{ broken: json' }),
			request.post(EXTRACT_PATH, { data: '{"url":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${EXTRACT_PATH} Zod validation chain is NOT entered on the feature-disabled branch`, async ({
		request
	}) => {
		// On the auth branch with `PLATFORM_API_URL` set,
		// the Zod validation chain runs: `url: z.string()
		// .url('Invalid URL format')` would surface
		// `'Invalid URL format'` for the empty / non-URL
		// payloads. The feature-disabled branch must
		// NEVER reach this chain.
		const responses = await Promise.all([
			request.post(EXTRACT_PATH, { data: {} }),
			request.post(EXTRACT_PATH, { data: { url: '' } }),
			request.post(EXTRACT_PATH, { data: { url: 'not-a-url' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid URL format');
			expect(body.featureDisabled).toBe(true);
		}
	});

	test(`POST ${EXTRACT_PATH} external fetch proxy is NOT entered on the feature-disabled branch`, async ({
		request
	}) => {
		// A regression that wired up `PLATFORM_API_URL`
		// for the test environment OR removed the
		// feature-disabled gate would surface here: the
		// response would lose its `featureDisabled: true`
		// key.
		const response = await request.post(EXTRACT_PATH, {
			data: { url: 'https://example.com/product' }
		});
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.featureDisabled).toBe(true);
		expect(body.success).toBe(false);
		expect(body.message).toBe(FEATURE_DISABLED_MESSAGE);
	});
});
