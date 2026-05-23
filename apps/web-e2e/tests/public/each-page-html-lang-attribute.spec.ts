import { test, expect } from '@playwright/test';

/**
 * Every rendered page must set <html lang="..."> so screen readers and
 * search engines know the document language. The lang attribute should
 * be a non-empty BCP 47 token (matches /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).
 */

const PUBLIC_PAGES = [
	'/',
	'/discover',
	'/categories',
	'/tags',
	'/about',
	'/pricing',
	'/help',
];

const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

test.describe('Public HTML: html[lang] attribute', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} has a non-empty html lang attribute matching BCP-47`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const lang = await page.locator('html').first().getAttribute('lang');
			expect(lang, `lang attr on ${path}`).not.toBeNull();
			expect(lang ?? '', `lang non-empty on ${path}`).not.toBe('');
			expect(lang ?? '', `lang BCP-47 on ${path}`).toMatch(BCP47_RE);
		});
	}
});
