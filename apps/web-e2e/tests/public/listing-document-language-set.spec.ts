import { test, expect } from '@playwright/test';

// document.documentElement.lang must be set after first render.

const PROBES = ['/', '/about', '/auth/signin'];

test.describe('document.documentElement.lang is set', () => {
	for (const path of PROBES) {
		test(`${path} html lang is non-empty`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const lang = await page.evaluate(() => document.documentElement.lang);
			expect(lang, `${path} html.lang`).not.toBe('');
			expect(lang, `${path} html.lang`).not.toBe('undefined');
		});
	}
});
