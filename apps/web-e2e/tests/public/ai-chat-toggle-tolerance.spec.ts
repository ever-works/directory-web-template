import { test, expect } from '@playwright/test';

// AI chat feature is gated via /api/config/features. Page-level chat UI
// behavior must be a no-op when disabled and must non-5xx when enabled.
// We don't assert on toggle state; we only assert the route doesn't crash.

const PROBES = [
	'/?chat=open',
	'/?chat=closed',
	'/discover/1?chat=open',
	'/items/sample?chat=open',
	'/items/sample?chat=closed',
	'/?chat=' + encodeURIComponent('NOT-A-MODE')
];

test.describe('AI chat toggle tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
