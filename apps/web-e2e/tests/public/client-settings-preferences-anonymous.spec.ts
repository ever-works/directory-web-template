import { test, expect } from '@playwright/test';

// New Settings Preferences section (Spec 029) — anonymous gate.

const PROBES = [
	'/client/settings',
	'/client/settings?section=preferences',
	'/en/client/settings?section=preferences',
	'/fr/client/settings?section=preferences',
	'/client/settings?section=preferences&_rsc=abc'
];

test.describe('Client settings preferences anonymous gate', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
