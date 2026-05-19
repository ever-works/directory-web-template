import { test, expect } from '@playwright/test';

// Real users navigate forward (home → category → item) AND back. Tests
// that the breadcrumb / back link / browser back button all keep working.

test.describe('Navigation forward + back', () => {
	test('home → categories → back returns to home', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const catsLink = page.getByRole('link', { name: /categories/i }).first();
		if (!(await catsLink.isVisible().catch(() => false))) {
			test.skip(true, 'No categories link visible on home');
			return;
		}
		await catsLink.click();
		await page.waitForLoadState('domcontentloaded');
		expect(page.url()).toMatch(/categories|category/);

		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/$|\/(en|fr|es|de|ar|zh)\/?$/);
	});

	test('about → home via header logo', async ({ page }) => {
		await page.goto('/about', { waitUntil: 'domcontentloaded' });
		const homeLink = page.getByRole('link', { name: /home/i }).first();
		if (!(await homeLink.isVisible().catch(() => false))) {
			test.skip(true, 'No home link visible');
			return;
		}
		await homeLink.click();
		await page.waitForLoadState('domcontentloaded');
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
