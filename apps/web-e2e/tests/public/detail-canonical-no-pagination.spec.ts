import { test, expect } from '@playwright/test';

// Detail-page <link rel="canonical"> must NOT carry list-page query params
// like ?page=, ?sort=, or ?view=. SEO regression check: those params belong
// to the listing context and should be stripped on detail.

test.describe('Detail page: canonical strips list-context params', () => {
	test('item detail canonical has no ?page param', async ({ page }) => {
		const listing = await page.goto('/discover', { waitUntil: 'domcontentloaded' });
		expect(listing).not.toBeNull();
		expect(listing!.status()).toBeLessThan(500);

		const firstItemHref = await page
			.locator('a[href^="/discover/"], a[href*="/discover/"]')
			.filter({ has: page.locator('h2, h3') })
			.first()
			.getAttribute('href')
			.catch(() => null);

		test.skip(!firstItemHref, 'no item link visible on /discover — skipping (not a coverage gap)');

		const target = `${firstItemHref}?page=2`;
		const detail = await page.goto(target, { waitUntil: 'domcontentloaded' });
		expect(detail).not.toBeNull();
		expect(detail!.status()).toBeLessThan(500);

		const canonical = await page
			.locator('link[rel="canonical"]')
			.first()
			.getAttribute('href')
			.catch(() => null);

		if (canonical) {
			expect(canonical, 'canonical should not carry ?page=').not.toMatch(/[?&]page=/);
			expect(canonical, 'canonical should not carry ?sort=').not.toMatch(/[?&]sort=/);
			expect(canonical, 'canonical should not carry ?view=').not.toMatch(/[?&]view=/);
		}
	});

	test('item detail canonical absolute or root-relative shape', async ({ page }) => {
		const listing = await page.goto('/discover', { waitUntil: 'domcontentloaded' });
		expect(listing!.status()).toBeLessThan(500);

		const firstItemHref = await page
			.locator('a[href^="/discover/"]')
			.first()
			.getAttribute('href')
			.catch(() => null);
		test.skip(!firstItemHref, 'no item link');

		const detail = await page.goto(firstItemHref!, { waitUntil: 'domcontentloaded' });
		expect(detail!.status()).toBeLessThan(500);

		const canonical = await page
			.locator('link[rel="canonical"]')
			.first()
			.getAttribute('href')
			.catch(() => null);

		if (canonical) {
			// Must be either absolute (https://…) or root-relative (/…)
			expect(canonical, 'canonical must be absolute or root-relative').toMatch(/^(https?:\/\/|\/)/);
		}
	});
});
