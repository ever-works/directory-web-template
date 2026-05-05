import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **PATCH / body / header surface**
 * of the admin-only navigation-update endpoint served by
 * the `PATCH` export of
 * `apps/web/app/api/admin/navigation/route.ts`.
 *
 * `PATCH /api/admin/navigation` is the **second admin-tree
 * smoke** the docs tree publishes that uses
 * `getCachedApiSession(req)` instead of `auth()` (after
 * `admin/settings` PATCH). It is also the **first PATCH-
 * only admin-tree smoke** that pins a **per-item path-
 * format XSS-prevention validation loop** via
 * `isValidNavigationPath(item.path)`.
 *
 *   1. **`getCachedApiSession(req)` session lookup** —
 *      matching `admin/settings` PATCH.
 *   2. **Single-step `!session?.user?.isAdmin` gate** →
 *      401 `{ error: 'Unauthorized' }` (BARE envelope,
 *      NO `success` key, SHORT message).
 *   3. **JSON body parse via `await req.json()`** AFTER
 *      the gate.
 *   4. **`type` enum check** — `if (!type || (type !==
 *      'header' && type !== 'footer'))` → 400 `{ error:
 *      'Type must be "header" or "footer"' }`.
 *   5. **`items` array check** — `if
 *      (!Array.isArray(items))` → 400 `{ error: 'Items
 *      must be an array' }`.
 *   6. **Per-item structure validation loop** — every
 *      item must have non-empty `label` and `path`
 *      string fields → 400 `{ error: 'Each item must
 *      have non-empty "label" and "path" string
 *      fields' }`.
 *   7. **Per-item path-format XSS-prevention
 *      validation** — `isValidNavigationPath(item.
 *      path)` → 400 `{ error: 'Invalid path format.
 *      Paths must start with "/" for internal routes
 *      or "http://"/"https://" for external URLs.' }`.
 *      The first PATCH smoke with a per-item XSS-
 *      prevention validation in a loop.
 *   8. **`configManager.updateNestedKey(key, items)`**
 *      — the load-bearing config.yml write. `key` is
 *      `'custom_header'` or `'custom_footer'` based on
 *      `type`.
 *   9. **Update-failed branch** — if `success` is
 *      falsy, returns 500 `{ error: 'Failed to update
 *      navigation' }`.
 *  10. **Success payload** — `{ success: true, type,
 *      items }` with status 200. UNIQUE: echoes both
 *      `type` and `items` from the input.
 *  11. **Outer catch** — `console.error` + 500
 *      `{ error: 'Failed to update navigation' }`.
 *  12. **Method-resolution surface** — the route
 *      exports `GET` and `PATCH`. `POST` / `PUT` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const NAVIGATION_PATH = '/api/admin/navigation';

const ADMIN_NAVIGATION_UPDATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const VALID_BODY = {
	type: 'header' as const,
	items: [
		{ label: 'Home', path: '/' },
		{ label: 'About', path: '/about' }
	]
};

const ADMIN_NAVIGATION_UPDATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (type-enum) if reachable)' },

	// Type enum probes.
	{ data: { type: 'invalid', items: [] }, label: 'invalid type (would 400 if reachable)' },
	{ data: { type: 'header' }, label: 'no items field (would 400 (items-array) if reachable)' },
	{ data: { items: [] }, label: 'no type field (would 400 (type-enum) if reachable)' },

	// Items array probes.
	{ data: { type: 'header', items: 'not-an-array' }, label: 'string items (would 400 (items-array) if reachable)' },
	{ data: { type: 'footer', items: null }, label: 'null items (would 400 (items-array) if reachable)' },

	// Per-item structure probes.
	{
		data: { type: 'header', items: [{ label: '', path: '/' }] },
		label: 'empty label (would 400 (item-struct) if reachable)'
	},
	{
		data: { type: 'header', items: [{ label: 'X', path: '   ' }] },
		label: 'whitespace path (would 400 (item-struct) if reachable)'
	},
	{
		data: { type: 'header', items: [{ label: 'X' }] },
		label: 'no path field (would 400 (item-struct) if reachable)'
	},

	// Per-item XSS-prevention probes.
	{
		data: { type: 'header', items: [{ label: 'X', path: 'javascript:alert(1)' }] },
		label: 'javascript: scheme (would 400 (xss) if reachable)'
	},
	{
		data: { type: 'header', items: [{ label: 'X', path: 'data:text/html,<script>' }] },
		label: 'data: scheme (would 400 (xss) if reachable)'
	},
	{
		data: { type: 'header', items: [{ label: 'X', path: 'no-leading-slash' }] },
		label: 'no leading slash (would 400 (xss) if reachable)'
	},

	// Valid bodies.
	{ data: VALID_BODY, label: 'valid header body' },
	{ data: { type: 'footer', items: VALID_BODY.items }, label: 'valid footer body' },
	{
		data: {
			type: 'header',
			items: [{ label: 'External', path: 'https://example.com' }]
		},
		label: 'valid body with external URL'
	},

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Type must be "header" or "footer"',
	'Items must be an array',
	'Each item must have non-empty "label" and "path" string fields',
	'Invalid path format. Paths must start with "/" for internal routes or "http://"/"https://" for external URLs.',
	'Failed to update navigation'
] as const;

const FORBIDDEN_KEYS = ['success', 'type', 'items'] as const;

const BARE_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/navigation PATCH body / header surface', () => {
	for (const { headers, label } of ADMIN_NAVIGATION_UPDATE_HEADERS) {
		test(`PATCH ${NAVIGATION_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.patch(NAVIGATION_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_NAVIGATION_UPDATE_BODIES) {
		test(`PATCH ${NAVIGATION_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.patch(NAVIGATION_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PATCH ${NAVIGATION_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		const response = await request.patch(NAVIGATION_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
	});

	test(`PATCH ${NAVIGATION_PATH} unauth envelope has NO success key`, async ({ request }) => {
		const response = await request.patch(NAVIGATION_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`PATCH ${NAVIGATION_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch returns `{ success: true, type,
		// items }` with status 200. The unauth branch must
		// NEVER reach the configManager.updateNestedKey call.
		const response = await request.patch(NAVIGATION_PATH, { data: VALID_BODY });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`PATCH ${NAVIGATION_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH),
			request.patch(NAVIGATION_PATH, { data: {} }),
			request.patch(NAVIGATION_PATH, { data: VALID_BODY })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`PATCH ${NAVIGATION_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.patch(NAVIGATION_PATH);
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH, { data: {} }),
			request.patch(NAVIGATION_PATH, { data: VALID_BODY }),
			request.patch(NAVIGATION_PATH, { data: { type: 'header', items: [] } }),
			request.patch(NAVIGATION_PATH, { data: { type: 'invalid', items: [] } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(NAVIGATION_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PATCH ${NAVIGATION_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.patch(NAVIGATION_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.patch(NAVIGATION_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${NAVIGATION_PATH} cross-method probe (POST / PUT / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(NAVIGATION_PATH),
			request.put(NAVIGATION_PATH),
			request.delete(NAVIGATION_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${NAVIGATION_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH, { data: 'not-json' }),
			request.patch(NAVIGATION_PATH, { data: '{ broken: json' }),
			request.patch(NAVIGATION_PATH, { data: '{"type":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${NAVIGATION_PATH} validation chain is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, every probe triggers a
		// distinct 400 envelope (type-enum / items-array /
		// per-item-struct / per-item-XSS). The unauth
		// branch must NEVER reach any of these.
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH, { data: { type: 'invalid', items: [] } }),
			request.patch(NAVIGATION_PATH, { data: { type: 'header', items: 'not-an-array' } }),
			request.patch(NAVIGATION_PATH, { data: { type: 'header', items: [{ label: '', path: '/' }] } }),
			request.patch(NAVIGATION_PATH, { data: { type: 'header', items: [{ label: 'X', path: 'javascript:alert(1)' }] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`PATCH ${NAVIGATION_PATH} XSS-prevention validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Per-item path-format validation prevents javascript:
		// data:, and other XSS-vector schemes. The unauth
		// branch must NEVER reach this validation.
		const responses = await Promise.all([
			request.patch(NAVIGATION_PATH, {
				data: { type: 'header', items: [{ label: 'X', path: 'javascript:alert(1)' }] }
			}),
			request.patch(NAVIGATION_PATH, {
				data: { type: 'header', items: [{ label: 'X', path: 'data:text/html,<script>' }] }
			}),
			request.patch(NAVIGATION_PATH, {
				data: { type: 'header', items: [{ label: 'X', path: 'no-leading-slash' }] }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe(
				'Invalid path format. Paths must start with "/" for internal routes or "http://"/"https://" for external URLs.'
			);
		}
	});

	test(`PATCH ${NAVIGATION_PATH} configManager update is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch with valid body,
		// `configManager.updateNestedKey('custom_header'
		// | 'custom_footer', items)` writes to config.yml.
		// The unauth branch must NEVER reach this call.
		const response = await request.patch(NAVIGATION_PATH, { data: VALID_BODY });
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.type).toBeUndefined();
		expect(body.items).toBeUndefined();
	});
});
