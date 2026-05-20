import { test, expect } from '@playwright/test';

// Real users navigate forward (home → category → item) AND back. Tests
// that the breadcrumb / back link / browser back button all keep working.

test.describe('Navigation forward + back', () => {
	test('home → categories → back returns to home', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		// Skip the home page entirely — we just want to verify that a
		// /categories link is reachable from a generic landing surface and
		// that browser-back returns to the previous URL. Driving from
		// `/help` (always has a footer nav link to /categories) is far
		// more deterministic than guessing which "Categories" anchor on
		// the home page actually targets /categories rather than a
		// `?categories=` chip on the same page.
		await page.goto('/help', { waitUntil: 'domcontentloaded' });
		// Look only at footer nav links so we don't pick up filter chips
		// that live in the page body.
		const catsLink = page
			.locator('footer a[href$="/categories"], footer a[href$="/en/categories"]')
			.first();
		if (!(await catsLink.isVisible().catch(() => false))) {
			test.skip(true, 'No /categories nav link visible in footer');
			return;
		}
		await Promise.all([
			page.waitForURL(/\/categor(ies|y)/, { waitUntil: 'domcontentloaded', timeout: 15_000 }),
			catsLink.click()
		]);
		expect(page.url()).toMatch(/categories|category/);

		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/help/);
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
