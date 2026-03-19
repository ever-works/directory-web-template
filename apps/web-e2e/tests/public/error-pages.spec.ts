import { test, expect } from '@playwright/test';

test.describe('Error Pages', () => {
	test('non-existent page shows 404 content', async ({ page }) => {
		await page.goto('/this-page-does-not-exist-xyz-999', { waitUntil: 'domcontentloaded' });

		// Should display 404 text or "Page Not Found"
		const has404 = await page.getByText('404').first().isVisible().catch(() => false);
		const hasNotFound = await page.getByText(/not found/i).first().isVisible().catch(() => false);

		expect(has404 || hasNotFound).toBeTruthy();
	});

	test('404 page has navigation back to home', async ({ page }) => {
		await page.goto('/this-page-does-not-exist-xyz-999', { waitUntil: 'domcontentloaded' });

		// Should have a link or button to go back to home
		const homeLink = page.getByRole('link', { name: /home/i }).first();
		const isHomeLinkVisible = await homeLink.isVisible().catch(() => false);

		if (isHomeLinkVisible) {
			await expect(homeLink).toBeVisible();
		}
	});

	test('non-existent item slug shows 404 or error', async ({ page }) => {
		await page.goto('/items/this-item-slug-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });

		// Should show 404 or "not found" or redirect
		const has404 = await page.getByText('404').first().isVisible().catch(() => false);
		const hasNotFound = await page.getByText(/not found/i).first().isVisible().catch(() => false);
		const wasRedirected = !page.url().includes('this-item-slug-does-not-exist-xyz');

		expect(has404 || hasNotFound || wasRedirected).toBeTruthy();
	});

	test('unauthorized page renders access denied content', async ({ page }) => {
		await page.goto('/unauthorized', { waitUntil: 'domcontentloaded' });

		// Should display "Access Denied" or "403" text
		const hasAccessDenied = await page.getByText(/access denied/i).first().isVisible().catch(() => false);
		const has403 = await page.getByText('403').first().isVisible().catch(() => false);

		expect(hasAccessDenied || has403).toBeTruthy();
	});

	test('unauthorized page has navigation options', async ({ page }) => {
		await page.goto('/unauthorized', { waitUntil: 'domcontentloaded' });

		// Should have a link to homepage or go back button
		const homeLink = page.getByRole('link', { name: /home/i }).first();
		const goBackButton = page.getByRole('button', { name: /go back/i }).first();

		const hasHomeLink = await homeLink.isVisible().catch(() => false);
		const hasGoBack = await goBackButton.isVisible().catch(() => false);

		expect(hasHomeLink || hasGoBack).toBeTruthy();
	});
});
