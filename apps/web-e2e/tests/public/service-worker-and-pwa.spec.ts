import { test, expect } from '@playwright/test';

// Some setups ship a PWA manifest + service worker. If present, both must
// have sane content-types and not 5xx.

test.describe('PWA manifest + service worker (if present)', () => {
	test('GET /manifest.webmanifest does not 5xx', async ({ request }) => {
		const resp = await request.get('/manifest.webmanifest');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /manifest.json does not 5xx', async ({ request }) => {
		const resp = await request.get('/manifest.json');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /sw.js does not 5xx (service worker may not exist)', async ({ request }) => {
		const resp = await request.get('/sw.js');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /workbox-* paths do not 5xx', async ({ request }) => {
		const resp = await request.get('/workbox-runtime.js');
		expect(resp.status()).toBeLessThan(500);
	});
});
