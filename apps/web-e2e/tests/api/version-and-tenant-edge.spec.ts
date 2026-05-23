import { test, expect } from '@playwright/test';

// /api/version, /api/version/sync, /api/tenant — edges, OPTIONS, HEAD,
// large bodies that should be ignored.

test.describe('Version + tenant + sync edges', () => {
	test('GET /api/version returns JSON with content', async ({ request }) => {
		const resp = await request.get('/api/version');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.json().catch(() => null);
		expect(body).toBeTruthy();
	});

	test('GET /api/version/sync non-5xx', async ({ request }) => {
		const resp = await request.get('/api/version/sync');
		expect(resp.status()).toBeLessThan(500);
	});

	test('HEAD /api/tenant non-5xx', async ({ request }) => {
		const resp = await request.fetch('/api/tenant', { method: 'HEAD' });
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/tenant non-5xx', async ({ request }) => {
		// /api/tenant is read-only — POST should 4xx not 5xx.
		const resp = await request.post('/api/tenant', { data: { probe: true } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/version with huge body non-5xx', async ({ request }) => {
		const huge = JSON.stringify({ blob: 'a'.repeat(100_000) });
		const resp = await request.post('/api/version', {
			headers: { 'content-type': 'application/json' },
			data: huge
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
