import { test, expect } from '@playwright/test';

// Anonymous load should not leak sensitive items into localStorage.

const SENSITIVE_KEY_REGEX = /(token|secret|jwt|password|api[_-]?key)/i;

const PROBES = ['/', '/auth/signin', '/discover/1', '/about'];

test.describe('No sensitive localStorage on anonymous load', () => {
	for (const path of PROBES) {
		test(`${path} no sensitive localStorage keys`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			await page.waitForTimeout(500);
			const keys = await page.evaluate(() => Object.keys(window.localStorage));
			const bad = keys.filter((k) => SENSITIVE_KEY_REGEX.test(k));
			expect(bad, `${path} sensitive localStorage keys: ${bad.join(', ')}`).toEqual([]);
		});
	}
});
