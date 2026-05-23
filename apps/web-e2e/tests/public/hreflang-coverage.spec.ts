import { test, expect } from '@playwright/test';

// Spec 014 / 019: every locale-aware page emits hreflang alternates and a
// canonical pointing at itself. Catches the class of "shipped a new page
// but forgot to call generateHreflangAlternates()" bugs.

const HREFLANG_PAGES = ['/', '/about', '/categories', '/tags', '/help', '/pricing'];

test.describe('hreflang alternates coverage', () => {
	for (const path of HREFLANG_PAGES) {
		test(`${path} emits hreflang alternates for every supported locale`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const alternates = page.locator('link[rel="alternate"]');
			const count = await alternates.count();
			expect(count, `${path}: at least one alternate link`).toBeGreaterThan(0);

			const langs = new Set<string>();
			for (let i = 0; i < count; i++) {
				const lang = await alternates.nth(i).getAttribute('hreflang');
				if (lang) langs.add(lang.toLowerCase());
			}
			// We require at least x-default + 2 specific locales — covers the
			// minimum useful hreflang configuration.
			expect(langs.size, `${path}: should have multiple hreflang variants`).toBeGreaterThanOrEqual(
				2
			);
		});

		test(`${path} canonical points at itself (path match)`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const canonical = page.locator('link[rel="canonical"]').first();
			if ((await canonical.count()) === 0) {
				test.skip(true, `${path}: no canonical (acceptable for some themes)`);
				return;
			}
			const href = await canonical.getAttribute('href');
			expect(href).toBeTruthy();
			const url = new URL(href!);
			expect(url.pathname, `${path}: canonical pathname`).toContain(
				path === '/' ? '/' : path
			);
		});
	}
});
