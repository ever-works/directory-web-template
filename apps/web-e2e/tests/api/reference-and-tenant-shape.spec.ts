import { test, expect } from '@playwright/test';

// /api/reference and /api/tenant are JSON discovery endpoints. Verify
// JSON shape and that they DON'T leak server secrets in their payloads.

test.describe('reference / tenant JSON discovery', () => {
	test('GET /api/reference returns valid JSON object', async ({ request }) => {
		const resp = await request.get('/api/reference');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) test.skip();
		const body = await resp.json().catch(() => null);
		expect(body, 'parsed body').toBeTruthy();
	});

	test('GET /api/tenant returns valid JSON object', async ({ request }) => {
		const resp = await request.get('/api/tenant');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) test.skip();
		const body = await resp.json().catch(() => null);
		expect(body, 'parsed body').toBeTruthy();
	});

	test('GET /api/version returns valid JSON', async ({ request }) => {
		const resp = await request.get('/api/version');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) test.skip();
		const body = await resp.json().catch(() => null);
		expect(body).toBeTruthy();
	});

	test('GET /api/config/features returns object', async ({ request }) => {
		const resp = await request.get('/api/config/features');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) test.skip();
		const body = await resp.json().catch(() => null);
		expect(body && typeof body === 'object').toBe(true);
	});
});

test.describe('No obvious secret leakage in discovery endpoints', () => {
	const FORBIDDEN = [
		'sk_live_',
		'sk_test_',
		'pk_live_',
		'-----BEGIN PRIVATE KEY-----',
		'-----BEGIN RSA PRIVATE KEY-----',
		'AKIA',
		'POSTGRES_PASSWORD',
		'DATABASE_URL=postgres'
	];

	for (const path of ['/api/tenant', '/api/reference', '/api/config/features', '/api/version']) {
		test(`${path} contains no obvious credentials`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const txt = await resp.text();
			for (const needle of FORBIDDEN) {
				expect(txt.toLowerCase().includes(needle.toLowerCase()), `${path} leaks ${needle}`).toBe(
					false
				);
			}
		});
	}
});
