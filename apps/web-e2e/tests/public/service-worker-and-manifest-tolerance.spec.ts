import { test, expect } from '@playwright/test';

// PWA-adjacent endpoints: service worker, manifest, app icons. None of
// these may 5xx on a HEAD request.

const PROBES = [
	'/sw.js',
	'/service-worker.js',
	'/workbox-sw.js',
	'/manifest.json',
	'/manifest.webmanifest',
	'/site.webmanifest',
	'/browserconfig.xml',
	'/pwa-192.png',
	'/pwa-512.png'
];

test.describe('PWA / SW endpoint tolerance', () => {
	for (const path of PROBES) {
		test(`HEAD ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'HEAD' });
			expect(resp.status(), `HEAD ${path}`).toBeLessThan(500);
		});

		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `GET ${path}`).toBeLessThan(500);
		});
	}
});
