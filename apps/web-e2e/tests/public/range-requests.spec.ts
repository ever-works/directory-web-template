import { test, expect } from '@playwright/test';

// Range requests on static assets — must return 206 partial or 200 full,
// not 5xx.

test.describe('Range requests on static assets', () => {
	test('GET / with Range: bytes=0-99 non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { range: 'bytes=0-99' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /favicon.ico with Range: bytes=0-9 non-5xx', async ({ request }) => {
		const resp = await request.get('/favicon.ico', { headers: { range: 'bytes=0-9' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with malformed Range non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { range: 'bytes=' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with overflowing Range non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { range: 'bytes=999999999999-' } });
		expect(resp.status()).toBeLessThan(500);
	});
});
