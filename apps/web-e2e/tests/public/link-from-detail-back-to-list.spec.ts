import { test, expect } from '@playwright/test';

// Real users navigate forward (home → category → item) AND back. Tests
// that the breadcrumb / back link / browser back button all keep working.

test.describe('Navigation forward + back', () => {
	test('home → categories → back returns to home', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		// Target an EXPLICIT navigation link to /categories (or the
		// locale-prefixed variant) instead of any link whose accessible
		// name happens to contain "categories" — the home page has tag/
		// category chips that link to `/?categories=X` and would match
		// the looser regex, never leaving the home page.
		const catsLink = page
			.locator('a[href$="/categories"], a[href*="/categories?"], a[href*="/categories/"]')
			.first();
		if (!(await catsLink.isVisible().catch(() => false))) {
			test.skip(true, 'No /categories nav link visible on home');
			return;
		}
		await Promise.all([
			page.waitForURL(/\/categor(ies|y)/, { waitUntil: 'domcontentloaded', timeout: 10_000 }),
			catsLink.click()
		]);
		expect(page.url()).toMatch(/categories|category/);

		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/$|\/(en|fr|es|de|ar|zh)\/?$/);
	});

	test('about → home via header logo', async ({ page }) => {
		await page.goto('/about', { waitUntil: 'domcontentloaded' });
		// Use the SiteLogo's wrapper anchor — it always points at the
		// locale root and is the deterministic "home" affordance. The
		// previous /home/i regex was matching a "Home" breadcrumb link
		// that *did* go home, but only when the breadcrumb rendered,
		// which depends on hydration timing.
		const homeLink = page
			.locator('header a[href="/"], header a[href$="/en"], header a[href$="/en/"]')
			.first();
		if (!(await homeLink.isVisible().catch(() => false))) {
			test.skip(true, 'No header home link visible');
			return;
		}
		await Promise.all([
			page.waitForURL(/\/(en|fr|es|de|ar|zh)?\/?$/, { waitUntil: 'domcontentloaded', timeout: 10_000 }),
			homeLink.click()
		]);
		expect(page.url()).toMatch(/\/(en|fr|es|de|ar|zh)?\/?$/);
	});

	test('forward → back → forward preserves URL state', async ({ page }) => {
		await page.goto('/discover/1?sort=newest', { waitUntil: 'domcontentloaded' });
		await page.goto('/about', { waitUntil: 'domcontentloaded' });
		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url(), 'back should preserve sort param').toContain('sort=newest');
		await page.goForward({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toContain('/about');
	});
});
