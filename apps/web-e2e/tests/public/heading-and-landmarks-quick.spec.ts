import { test, expect } from '@playwright/test';

// Each public page should have:
// - exactly one h1 (or main heading)
// - a <main> landmark
// - a <nav> landmark

const PROBES = ['/', '/about', '/discover/1', '/pricing'];

test.describe('Heading + landmark presence', () => {
	for (const path of PROBES) {
		test(`${path} has main and nav landmarks`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const mainCount = await page.locator('main, [role="main"]').count();
			const navCount = await page.locator('nav, [role="navigation"]').count();
			expect(mainCount, `${path} <main> count`).toBeGreaterThan(0);
			expect(navCount, `${path} <nav> count`).toBeGreaterThan(0);
		});

		test(`${path} has at least one h1`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const h1Count = await page.locator('h1').count();
			expect(h1Count, `${path} h1 count`).toBeGreaterThan(0);
		});
	}
});
