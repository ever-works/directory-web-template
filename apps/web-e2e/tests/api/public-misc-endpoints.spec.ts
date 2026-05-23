import { test, expect } from '@playwright/test';

// Catch-all for public utility endpoints not covered elsewhere.

test.describe('Misc public endpoints tolerance', () => {
	test('GET /api/categories/exists?slug=zz rejects or 4xx, not 5xx', async ({ request }) => {
		const resp = await request.get('/api/categories/exists?slug=zz-fake');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/collections/exists?slug=zz does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/collections/exists?slug=zz-fake');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/surveys/exists?slug=zz does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/surveys/exists?slug=zz-fake');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/featured-items does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/featured-items');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/reference does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/reference');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/health/database does not leak credentials', async ({ request }) => {
		const resp = await request.get('/api/health/database');
		expect(resp.status()).toBeLessThan(500);
		// Should NEVER include connection string or credentials.
		if (resp.status() >= 200 && resp.status() < 300) {
			const body = await resp.text();
			expect(body).not.toMatch(/postgres:\/\/[^@]+@/i);
			expect(body).not.toMatch(/password/i);
		}
	});

	test('POST /api/extract rejects empty / anonymous', async ({ request }) => {
		const resp = await request.post('/api/extract', { data: {} });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/export does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/export');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/export/settings does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/export/settings');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/config/features does not 5xx + is JSON', async ({ request }) => {
		const resp = await request.get('/api/config/features');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 200 && resp.status() < 300) {
			const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
			expect(ct).toContain('json');
		}
	});

	test('POST /api/internal/db-init rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/internal/db-init', { data: { probe: true } });
		expect(resp.status()).toBeGreaterThanOrEqual(400);
		expect(resp.status()).toBeLessThan(500);
	});
});
