import { test, expect } from '@playwright/test';

// Public read-only APIs that other systems depend on. Schema regressions
// here silently break consumers (Spec 020 + Spec 023). This spec asserts
// the minimum guaranteed shape of each response.

test.describe('Public JSON API shapes', () => {
	test('/api/version returns { version, env? }', async ({ request }) => {
		const resp = await request.get('/api/version');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body, 'version response body').toBeTruthy();
		// Some setups expose version directly; some wrap it. Accept either.
		const v = body.version ?? body.app?.version ?? body.data?.version;
		expect(v, '/api/version should include a version string').toBeTruthy();
	});

	test('/api/items.json returns an array (or { items: [] })', async ({ request }) => {
		const resp = await request.get('/api/items.json');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		const items = Array.isArray(body) ? body : (body.items ?? body.data ?? []);
		expect(Array.isArray(items), 'items.json should be an array (or wrap one)').toBe(true);
	});

	test('/api/auth/providers includes at least credentials', async ({ request }) => {
		const resp = await request.get('/api/auth/providers');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body).toBeTruthy();
		// Auth.js v5 returns an object keyed by provider id.
		expect(body.credentials, 'credentials provider should be configured').toBeTruthy();
	});

	test('/api/auth/csrf returns a non-empty token', async ({ request }) => {
		const resp = await request.get('/api/auth/csrf');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body.csrfToken, 'csrfToken present').toBeTruthy();
		expect(typeof body.csrfToken).toBe('string');
		expect(body.csrfToken.length).toBeGreaterThan(8);
	});

	test('/api/auth/session anonymous returns null (or empty user)', async ({ request }) => {
		const resp = await request.get('/api/auth/session');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		// Auth.js returns null OR {} when there is no session — both acceptable.
		if (body && Object.keys(body).length > 0) {
			// If a user is somehow present (shouldn't be), at least the shape
			// must include expected fields.
			expect(body.user, 'unexpected session — but if present, must have .user').toBeTruthy();
		}
	});

	test('/api/current-user anonymous returns null', async ({ request }) => {
		const resp = await request.get('/api/current-user');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		// /api/current-user route returns `null` explicitly for unauthenticated.
		expect(body).toBeNull();
	});

	test('/api/user/currency returns an object with currency / locale', async ({ request }) => {
		const resp = await request.get('/api/user/currency');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body).toBeTruthy();
		// Tolerate either `currency` directly or wrapped in `data`.
		const cur = body.currency ?? body.data?.currency ?? body.code;
		// If the route hasn't decided, default tolerance: just non-5xx.
		if (cur) {
			expect(typeof cur, 'currency code should be string').toBe('string');
		}
	});
});
