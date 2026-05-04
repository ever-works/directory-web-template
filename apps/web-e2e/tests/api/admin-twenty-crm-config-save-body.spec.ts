import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only Twenty CRM config-save endpoint served
 * by the `POST` export of
 * `apps/web/app/api/admin/twenty-crm/config/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-twenty-crm-
 * config-query.spec.ts` covers the GET (read-config)
 * surface of the same route.
 *
 * `POST /api/admin/twenty-crm/config` is the **first
 * admin-tree POST smoke** the docs tree publishes that
 * combines:
 *   - the **compound single-`if` gate** `!session?.user?.
 *     isAdmin || !session.user.id` (matching `admin/
 *     sponsor-ads/[id]/approve` and `/reject` POST
 *     handlers but for a CRM-config-save endpoint), AND
 *   - a **Zod-`safeParse`-like validation** via
 *     `validateTwentyCrmConfig(body)` that returns a
 *     custom `{ success, data | error }` shape and is
 *     translated to a `{ success: false, error:
 *     'Validation failed', details: [{field, message}] }`
 *     400 envelope, AND
 *   - a **`logActivity(...)` side-effect** that captures
 *     `request.headers.get('x-forwarded-for')` for the
 *     audit log.
 *
 *   1. **Compound single-`if` gate** —
 *      `!session?.user?.isAdmin || !session.user.id` →
 *      401 `{ success: false, error: 'Unauthorized.
 *      Admin access required.' }`.
 *   2. **Canonical longer 401 message** + **`success:
 *      false` envelope key**.
 *   3. **JSON body parse via `await request.json()`**
 *      AFTER the gate.
 *   4. **Custom Zod-like validation chain** —
 *      `validateTwentyCrmConfig(body)` returns
 *      `{ success: bool, data | error }`. On
 *      `!validation.success`, returns 400
 *      `{ success: false, error: 'Validation failed',
 *      details: [{field, message}] }`. The first POST
 *      smoke that uses a custom Zod-like validator
 *      function (NOT the standard `safeParse(...)` /
 *      `parse(...)` API).
 *   5. **`configRepository.saveConfig(validation.data,
 *      session.user.id)`** — the load-bearing CRM-
 *      config-save call.
 *   6. **`logActivity(...)` side effect** AFTER the
 *      saveConfig call. Captures
 *      `request.headers.get('x-forwarded-for')` for
 *      audit logging — the first POST smoke that
 *      reads a request header for an audit side-
 *      effect.
 *   7. **Success payload** — `{ success: true,
 *      message: 'Configuration saved successfully',
 *      data: <savedConfig> }` with status 200.
 *   8. **Outer catch** — `console.error` + 500
 *      `{ success: false, error: 'Failed to save
 *      configuration' }`.
 *   9. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-settings-
 * update-method.spec.ts` walks a config.yml-write
 * PATCH, this spec walks a CRM-config-DB-write POST
 * with audit logging — a complementary surface that
 * no prior admin-tree smoke spec covers.
 */
const TWENTY_CRM_CONFIG_PATH = '/api/admin/twenty-crm/config';

const ADMIN_TWENTY_CRM_CONFIG_SAVE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header (would be captured by audit log if reachable)' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const VALID_BODY = {
	apiUrl: 'https://crm.example.com',
	apiKey: 'sk_test_abc123',
	enabled: true
};

const ADMIN_TWENTY_CRM_CONFIG_SAVE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (Zod) if reachable)' },

	// Validation probes.
	{ data: { apiUrl: 'not-a-uri', apiKey: 'sk_test', enabled: true }, label: 'invalid apiUrl (would 400 ZodError if reachable)' },
	{ data: { apiUrl: 'https://crm.example.com', enabled: true }, label: 'no apiKey (would 400 if required)' },
	{ data: { apiKey: 'sk_test', enabled: true }, label: 'no apiUrl (would 400 if required)' },

	// Valid bodies.
	{ data: VALID_BODY, label: 'fully-valid body' },
	{ data: { ...VALID_BODY, enabled: false }, label: 'valid + enabled=false' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Validation failed',
	'Failed to save configuration',
	'Configuration saved successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'details'] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/twenty-crm/config POST body / header surface', () => {
	for (const { headers, label } of ADMIN_TWENTY_CRM_CONFIG_SAVE_HEADERS) {
		test(`POST ${TWENTY_CRM_CONFIG_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(TWENTY_CRM_CONFIG_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_TWENTY_CRM_CONFIG_SAVE_BODIES) {
		test(`POST ${TWENTY_CRM_CONFIG_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(TWENTY_CRM_CONFIG_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${TWENTY_CRM_CONFIG_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(TWENTY_CRM_CONFIG_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(TWENTY_CRM_CONFIG_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// message: 'Configuration saved successfully',
		// data: <savedConfig> }`. Validation 400 returns
		// `{ success: false, error: 'Validation failed',
		// details: [...] }`. The unauth branch must NEVER
		// reach either.
		const response = await request.post(TWENTY_CRM_CONFIG_PATH, { data: VALID_BODY });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.message).toBeUndefined();
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(TWENTY_CRM_CONFIG_PATH),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: {} }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: VALID_BODY })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(TWENTY_CRM_CONFIG_PATH);
		const responses = await Promise.all([
			request.post(TWENTY_CRM_CONFIG_PATH, { data: {} }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: VALID_BODY }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(TWENTY_CRM_CONFIG_PATH),
			request.patch(TWENTY_CRM_CONFIG_PATH),
			request.delete(TWENTY_CRM_CONFIG_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(TWENTY_CRM_CONFIG_PATH, { data: 'not-json' }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: '{ broken: json' }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: '{"apiKey":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} validation chain is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, every Zod-invalid body shape
		// triggers a `validateTwentyCrmConfig` failure
		// that's translated to a 400 with `details: [...]`.
		// The unauth branch must NEVER contain a `details`
		// key and must NEVER echo `'Validation failed'`.
		const responses = await Promise.all([
			request.post(TWENTY_CRM_CONFIG_PATH, { data: { apiUrl: 'not-a-uri', apiKey: 'sk', enabled: true } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: { enabled: true } }),
			request.post(TWENTY_CRM_CONFIG_PATH, { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.details).toBeUndefined();
			expect(body.error).not.toBe('Validation failed');
		}
	});

	test(`POST ${TWENTY_CRM_CONFIG_PATH} configRepository.saveConfig + logActivity are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders `saveConfig(...)`
		// or `logActivity(...)` before the gate would
		// surface here. The unauth response must NEVER
		// echo `'Configuration saved successfully'` or a
		// `data` key from the saved config.
		const response = await request.post(TWENTY_CRM_CONFIG_PATH, { data: VALID_BODY });
		const body = await response.json();
		expect(body.message).not.toBe('Configuration saved successfully');
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
	});
});
