import { test, expect } from '@playwright/test';

// Public static assets (favicon, manifest, etc) must return 200 with the
// right content-type — or 404, never 5xx.

const STATIC_ASSETS = [
	'/favicon.ico',
	'/apple-touch-icon.png',
	'/manifest.json',
	'/manifest.webmanifest',
	'/site.webmanifest',
	'/browserconfig.xml',
	'/robots.txt'
];

test.describe('Static asset coverage', () => {
	for (const path of STATIC_ASSETS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}

	test('GET / responds with HTML content-type', async ({ request }) => {
		const resp = await request.get('/');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() < 400) {
			const ct = (resp.headers()['content-type'] || '').toLowerCase();
			expect(ct).toContain('text/html');
		}
	});
});
