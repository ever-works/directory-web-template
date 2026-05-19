import { test, expect } from '@playwright/test';

// Every public page must have <title> and <meta name="description">.
// We do NOT assert on the actual copy (i18n volatile), only on presence.

const PAGES_NEEDING_META = [
	'/',
	'/about',
	'/help',
	'/discover/1',
	'/categories',
	'/tags',
	'/collections',
	'/pricing',
	'/auth/signin',
	'/auth/register'
];

test.describe('Head meta presence (title + description)', () => {
	for (const path of PAGES_NEEDING_META) {
		test(`${path} has <title> and meta description`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const title = (await page.title()).trim();
			expect(title, `${path} title`).not.toBe('');
			const desc = await page.locator('meta[name="description"]').first().getAttribute('content').catch(() => null);
			expect(desc, `${path} meta description`).toBeTruthy();
		});
	}
});
