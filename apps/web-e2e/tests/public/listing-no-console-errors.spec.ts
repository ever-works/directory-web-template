import { test, expect } from '@playwright/test';

// Page console must not throw uncaught errors during a single navigation.
// We DO allow warnings; we DO NOT allow uncaught exceptions.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin'];

test.describe('No uncaught JS errors during navigation', () => {
	for (const path of PROBES) {
		test(`${path} navigation does not throw uncaught`, async ({ page }) => {
			const uncaught: string[] = [];
			page.on('pageerror', (err) => uncaught.push(String(err.message || err)));
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			// Settle a bit so any deferred scripts fire.
			await page.waitForTimeout(800);
			expect(uncaught, `uncaught errors on ${path}: ${uncaught.join(' | ')}`).toEqual([]);
		});
	}
});
