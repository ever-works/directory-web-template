import { test, expect } from '@playwright/test';

// Non-existent admin routes should bounce to signin OR 404 — never 5xx,
// never 200 with full admin UI.

const PROBES = [
	'/admin/foo-does-not-exist',
	'/admin/items/foo-does-not-exist',
	'/admin/users/foo-does-not-exist',
	'/admin/surveys/foo-does-not-exist',
	'/admin/' + 'a'.repeat(256)
];

test.describe('Non-existent admin paths', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
