import { test, expect } from '@playwright/test';

// On first paint, no native <dialog> should be open without user
// interaction. Modals that auto-open on load are a UX red flag.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('No auto-open <dialog> on first paint', () => {
	for (const path of PROBES) {
		test(`${path} no dialog[open]`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const openDialogs = await page.locator('dialog[open]').count();
			expect(openDialogs, `${path} open dialogs: ${openDialogs}`).toBe(0);
		});
	}
});
