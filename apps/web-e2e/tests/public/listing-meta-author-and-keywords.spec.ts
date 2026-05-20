import { test, expect } from '@playwright/test';

// meta name=author / keywords / generator presence — advisory only.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('Meta author/keywords/generator presence', () => {
	for (const path of PROBES) {
		test(`${path} meta author exists or is absent (non-empty if present)`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const author = await page.locator('meta[name="author"]').first().getAttribute('content').catch(() => null);
			if (author !== null && author !== undefined) {
				expect(author.trim()).not.toBe('');
				expect(author.trim()).not.toBe('undefined');
			}
		});
	}
});
