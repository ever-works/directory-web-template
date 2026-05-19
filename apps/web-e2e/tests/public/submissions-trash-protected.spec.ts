import { test, expect } from '@playwright/test';

// /client/submissions/trash + /client/settings/profile/submissions/trash
// anonymous gate, locale-prefixed and RSC variants.

const PROBES = [
	'/client/submissions/trash',
	'/client/submissions/trash?_rsc=abc',
	'/client/settings/profile/submissions/trash',
	'/en/client/submissions/trash',
	'/fr/client/submissions/trash',
	'/de/client/settings/profile/submissions/trash'
];

test.describe('Submissions trash anonymous gate', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
