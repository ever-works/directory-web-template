import { test, expect } from '@playwright/test';

// Detailed favicon coverage: every common path must non-5xx. We do not
// require them all to be 200 (the project may skip some), but if they
// exist they must serve image MIME types.

const FAVICON_PATHS = [
	'/favicon.ico',
	'/favicon-16x16.png',
	'/favicon-32x32.png',
	'/favicon-96x96.png',
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
	'/apple-touch-icon.png',
	'/apple-touch-icon-precomposed.png',
	'/mstile-150x150.png',
	'/safari-pinned-tab.svg'
];

test.describe('Favicon assets non-5xx + image-ish CT when present', () => {
	for (const path of FAVICON_PATHS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			if (resp.status() < 400) {
				const ct = (resp.headers()['content-type'] || '').toLowerCase();
				expect(ct, `${path} content-type`).toMatch(/(image\/|application\/octet-stream)/);
			}
		});
	}
});
