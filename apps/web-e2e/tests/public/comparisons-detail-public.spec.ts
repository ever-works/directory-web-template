import { test, expect } from '@playwright/test';

// /comparisons index renders. Detail comparisons live at /comparisons/[slug]
// and depend on seeded data; we don't assert content, only that an arbitrary
// slug responds non-5xx (a 404 for a non-existent comparison is fine).

const COMPARISON_PROBES = [
	'/comparisons/does-not-exist-zzz',
	'/comparisons/sample',
	'/comparisons/a-vs-b'
];

test.describe('Comparisons detail public tolerance', () => {
	for (const path of COMPARISON_PROBES) {
		test(`${path} responds non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('/comparisons index renders', async ({ page }) => {
		const resp = await page.goto('/comparisons', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});
});
