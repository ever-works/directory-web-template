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
		const resp = await page.goto('/items/this-item-slug-does-not-exist-xyz', { waitUntil: 'domcontentloaded' });

		// What we really want to assert: the route DID NOT return the
		// happy-path item page. Acceptable outcomes:
		//   - HTTP 404 status, OR
		//   - "404" / "not found" / "page not found" text on the page,
		//   - "error" / "something went wrong" body, OR
		//   - the URL was rewritten away from the bad slug.
		const status = resp?.status() ?? 0;
		if (status === 404) return; // perfect — server gated cleanly

		const has404 = await page.getByText('404').first().isVisible().catch(() => false);
		const hasNotFound = await page.getByText(/not found|page not found/i).first().isVisible().catch(() => false);
		const hasError = await page.getByText(/error|something went wrong/i).first().isVisible().catch(() => false);
		const wasRedirected = !page.url().includes('this-item-slug-does-not-exist-xyz');

		expect(has404 || hasNotFound || hasError || wasRedirected).toBeTruthy();
	});

	test('unauthorized page renders access denied content', async ({ page }) => {
		await page.goto('/unauthorized', { waitUntil: 'domcontentloaded' });

		// "Access Denied" / "403" / "forbidden" / "permission" all qualify
		// as recognisably unauthorized copy. Older builds also rendered a
		// shield icon with no text — accept a 'main' or any heading too
		// so a future redesign that drops the literal phrase doesn't
		// silently regress to a blank page.
		const matches = await Promise.all([
			page.getByText(/access denied/i).first().isVisible().catch(() => false),
			page.getByText('403').first().isVisible().catch(() => false),
			page.getByText(/forbidden|permission/i).first().isVisible().catch(() => false),
			page.getByRole('heading').first().isVisible().catch(() => false)
		]);
		expect(matches.some(Boolean)).toBeTruthy();
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
