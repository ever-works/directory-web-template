import { test, expect } from '@playwright/test';

// Light performance budget: home and signin pages should reach
// 'domcontentloaded' under 15s in CI. Vague but catches "dev script
// blocking" or "infinite fetch loop" regressions.

const PAGES = ['/', '/about', '/discover/1', '/auth/signin'];

test.describe('Time-to-DOM-Content budget', () => {
	for (const path of PAGES) {
		test(`${path} reaches domcontentloaded under 15s`, async ({ page }) => {
			const start = Date.now();
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
			const elapsed = Date.now() - start;
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
			expect(elapsed, `${path} reached DOM in ${elapsed}ms`).toBeLessThan(15_000);
		});
	}
});
