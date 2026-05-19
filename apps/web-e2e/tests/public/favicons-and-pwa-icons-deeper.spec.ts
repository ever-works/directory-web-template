import { test, expect } from '@playwright/test';

// Icons / PWA assets — additional shapes (mstile/maskable/etc).

const ASSETS = [
	'/mstile-70x70.png',
	'/mstile-150x150.png',
	'/mstile-310x310.png',
	'/mstile-310x150.png',
	'/icon-192x192.png',
	'/icon-512x512.png',
	'/icon-maskable.png',
	'/icon-192-maskable.png',
	'/icon-512-maskable.png',
	'/apple-icon-180x180.png',
	'/apple-touch-icon-152x152.png'
];

test.describe('Extended PWA icons non-5xx', () => {
	for (const path of ASSETS) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
