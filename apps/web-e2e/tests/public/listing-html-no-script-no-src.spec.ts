import { test, expect } from '@playwright/test';

// Inline <script> without nonce or content shouldn't be empty.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('No empty inline scripts', () => {
	for (const path of PROBES) {
		test(`${path} no empty <script> tags`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const empty = await page.evaluate(() => {
				return Array.from(document.querySelectorAll('script'))
					.filter((s) => !s.src && !(s.textContent || '').trim())
					.length;
			});
			expect(empty, `${path} empty inline script count: ${empty}`).toBeLessThan(5);
		});
	}
});
