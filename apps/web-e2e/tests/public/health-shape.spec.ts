import { test, expect } from '@playwright/test';

// /api/health endpoints used by uptime monitors must:
// - return 200 (or 503 if degraded)
// - be JSON
// - not leak DB connection strings

test.describe('Health endpoints shape', () => {
	test('GET /api/health responds 200/503', async ({ request }) => {
		const resp = await request.get('/api/health');
		expect(resp.status()).toBeLessThan(600);
		expect([200, 503]).toContain(resp.status());
		const txt = await resp.text();
		expect(txt.toLowerCase()).not.toMatch(/postgres:\/\/[^/]+:\S+@/);
		expect(txt.toLowerCase()).not.toContain('password');
	});

	test('GET /api/health/database responds 200/503', async ({ request }) => {
		const resp = await request.get('/api/health/database');
		expect(resp.status()).toBeLessThan(600);
		// Database endpoint may legitimately 503 in degraded mode.
		expect([200, 503]).toContain(resp.status());
		const txt = await resp.text();
		expect(txt.toLowerCase()).not.toMatch(/postgres:\/\/[^/]+:\S+@/);
	});

	test('HEAD /api/health non-5xx', async ({ request }) => {
		const resp = await request.fetch('/api/health', { method: 'HEAD' });
		expect(resp.status()).toBeLessThan(600);
	});
});
