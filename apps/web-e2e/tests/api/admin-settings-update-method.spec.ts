import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **PATCH / body / header surface**
 * of the admin-only settings-update endpoint served by the
 * `PATCH` export of
 * `apps/web/app/api/admin/settings/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-settings-
 * query.spec.ts` covers the GET (read-config) surface of
 * the same route. This spec covers the PATCH (update-
 * config) surface that no prior admin-tree smoke spec
 * touches.
 *
 * `PATCH /api/admin/settings` is the **first PATCH-only
 * collection-level config-write admin-tree smoke** the
 * docs tree publishes. It is also the **first** admin-
 * tree smoke that uses `getCachedApiSession(req)`
 * instead of `auth()` — a cached-session-lookup variant
 * that distinct from every prior smoke.
 *
 *   1. **`getCachedApiSession(req)` session lookup** —
 *      distinct from `auth()` which every prior admin
 *      smoke uses. The cached-session lookup path is a
 *      performance optimization but functionally
 *      equivalent on the unauth branch.
 *   2. **Single-step `!session?.user?.isAdmin` gate** →
 *      401 `{ error: 'Unauthorized' }` (BARE envelope,
 *      NO `success` key, SHORT message — distinct from
 *      every prior admin smoke).
 *   3. **JSON body parse via `await req.json()`** AFTER
 *      the gate. NOT wrapped in a per-call try/catch.
 *   4. **Single-field required check** — `if (!key)` →
 *      400 `{ error: 'Key is required' }` (bare
 *      envelope).
 *   5. **`configManager.updateNestedKey(\`settings.
 *      ${key}\`, value)`** — the load-bearing config-
 *      write. Updates a nested key under `settings.*`
 *      in the config.yml file.
 *   6. **Update-failed branch** — if `success` is
 *      falsy, returns 500 `{ error: 'Failed to update
 *      setting' }`.
 *   7. **Success payload** — `{ success: true, key,
 *      value }` with status 200. UNIQUE: echoes the
 *      `key` and `value` from the input body, distinct
 *      from prior PATCH smokes.
 *   8. **Outer catch** — `console.error` + 500
 *      `{ error: 'Failed to update settings' }`.
 *   9. **Method-resolution surface** — the route
 *      exports `GET` and `PATCH`. POST / PUT / DELETE
 *      must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-categories-
 * git-create-body.spec.ts` walks a Git-CMS-write POST,
 * this spec walks a config.yml-write PATCH — a
 * complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const SETTINGS_PATH = '/api/admin/settings';

const ADMIN_SETTINGS_UPDATE_HEADERS = [
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
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_SETTINGS_UPDATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-key) if reachable)' },

	// Key-required probes.
	{ data: { value: 'X' }, label: 'value-only body (would 400 (req-key) if reachable)' },
	{ data: { key: '' }, label: 'empty key (would 400 (req-key) if reachable)' },
	{ data: { key: null }, label: 'null key (would 400 (req-key) if reachable)' },

	// Valid bodies (would commit to config.yml if reachable).
	{ data: { key: 'maxItemsPerPage', value: 50 }, label: 'numeric value' },
	{ data: { key: 'siteName', value: 'New Site Name' }, label: 'string value' },
	{ data: { key: 'enableComments', value: true }, label: 'boolean true value' },
	{ data: { key: 'enableComments', value: false }, label: 'boolean false value' },
	{ data: { key: 'theme', value: { primary: '#fff' } }, label: 'object value (nested)' },
	{ data: { key: 'tags', value: ['a', 'b'] }, label: 'array value' },
	{ data: { key: 'feature', value: null }, label: 'null value (clear)' },

	// Bypass attempts.
	{ data: { key: 'k', value: 'v', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { key: 'k', value: 'v', tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { key: 'k', value: 'v', padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Key is required',
	'Failed to update setting',
	'Failed to update settings'
] as const;

const FORBIDDEN_KEYS = ['success', 'key', 'value'] as const;

const BARE_401_MESSAGE = 'Unauthorized';
const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/settings PATCH body / header surface', () => {
	for (const { headers, label } of ADMIN_SETTINGS_UPDATE_HEADERS) {
		test(`PATCH ${SETTINGS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.patch(SETTINGS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_SETTINGS_UPDATE_BODIES) {
		test(`PATCH ${SETTINGS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.patch(SETTINGS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PATCH ${SETTINGS_PATH} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.patch(SETTINGS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`PATCH ${SETTINGS_PATH} unauth envelope has NO success key`, async ({ request }) => {
		const response = await request.patch(SETTINGS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`PATCH ${SETTINGS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch returns `{ success: true, key,
		// value }` with status 200. The unauth branch must
		// NEVER reach the configManager.updateNestedKey
		// call.
		const response = await request.patch(SETTINGS_PATH, { data: { key: 'someKey', value: 'someValue' } });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`PATCH ${SETTINGS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH),
			request.patch(SETTINGS_PATH, { data: {} }),
			request.patch(SETTINGS_PATH, { data: { key: 'k', value: 'v' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`PATCH ${SETTINGS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.patch(SETTINGS_PATH);
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH, { data: {} }),
			request.patch(SETTINGS_PATH, { data: { key: 'k', value: 'v' } }),
			request.patch(SETTINGS_PATH, { data: { key: 'k', value: 42 } }),
			request.patch(SETTINGS_PATH, { data: { isAdmin: true, key: 'k', value: 'v' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(SETTINGS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${SETTINGS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.patch(SETTINGS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.patch(SETTINGS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.patch(SETTINGS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${SETTINGS_PATH} cross-method probe (POST / PUT / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(SETTINGS_PATH),
			request.put(SETTINGS_PATH),
			request.delete(SETTINGS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${SETTINGS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH, { data: 'not-json' }),
			request.patch(SETTINGS_PATH, { data: '{ broken: json' }),
			request.patch(SETTINGS_PATH, { data: '{"key":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${SETTINGS_PATH} required-key check is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH, { data: {} }),
			request.patch(SETTINGS_PATH, { data: { value: 'X' } }),
			request.patch(SETTINGS_PATH, { data: { key: '' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Key is required');
		}
	});

	test(`PATCH ${SETTINGS_PATH} configManager update is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch with valid body,
		// `configManager.updateNestedKey('settings.${key}',
		// value)` writes to config.yml. The unauth branch
		// must NEVER reach this call. The success branch's
		// `key` and `value` echoes must NEVER appear in
		// the unauth response.
		const responses = await Promise.all([
			request.patch(SETTINGS_PATH, { data: { key: 'maxItemsPerPage', value: 50 } }),
			request.patch(SETTINGS_PATH, { data: { key: 'siteName', value: 'pwned' } }),
			request.patch(SETTINGS_PATH, { data: { key: 'enableComments', value: true } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.success).toBeUndefined();
			expect(body.key).toBeUndefined();
			expect(body.value).toBeUndefined();
		}
	});
});
