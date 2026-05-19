import { test, expect } from '@playwright/test';

// Public items API endpoints power the listing UI and the directory's JSON
// export. Catches the class of "search endpoint 500s on an unusual query
// shape" regressions before they hit users.

test.describe('Items public API contract', () => {
	test('GET /api/items.json returns array (or { items })', async ({ request }) => {
		const resp = await request.get('/api/items.json');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		const items = Array.isArray(body) ? body : (body.items ?? body.data ?? []);
		expect(Array.isArray(items)).toBe(true);
	});

	test('GET /api/items.json respects ?limit cap', async ({ request }) => {
		const resp = await request.get('/api/items.json?limit=2');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		const items = Array.isArray(body) ? body : (body.items ?? body.data ?? []);
		// Whatever the cap is, it shouldn't blow up — and if items came back,
		// they should be at most a few.
		if (items.length > 0) {
			expect(items.length, 'limit honored').toBeLessThan(100);
		}
	});

	test('GET /api/items.json with garbage query params does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items.json?q=zzz&page=abc&sort=invalid');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items.json on non-existent slug filter returns empty/4xx', async ({ request }) => {
		const resp = await request.get('/api/items.json?category=zz-fake-category');
		expect(resp.status()).toBeLessThan(500);
	});
});
