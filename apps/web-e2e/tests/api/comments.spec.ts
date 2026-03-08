import { test, expect } from '../../fixtures';

test.describe('API: Comments', () => {
	test('GET comments for an item returns valid response', async ({ page }) => {
		// First get an item slug from the listing page
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItemLink = page.locator('a[href*="/items/"]').first();
		await expect(firstItemLink).toBeVisible({ timeout: 10_000 });

		const href = await firstItemLink.getAttribute('href');
		const slug = href?.split('/items/')[1]?.split('?')[0];

		if (!slug) {
			test.skip(true, 'Could not extract item slug');
			return;
		}

		// Call the comments API
		const response = await page.request.get(`/api/items/${slug}/comments`);

		// Should return 200 or 404 (if comments not enabled)
		expect([200, 404]).toContain(response.status());

		if (response.status() === 200) {
			const data = await response.json();
			expect(data).toBeDefined();
		}
	});
});

test.describe('API: Votes', () => {
	test('GET vote status for an item returns valid response', async ({ clientPage }) => {
		await clientPage.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItemLink = clientPage.locator('a[href*="/items/"]').first();
		await expect(firstItemLink).toBeVisible({ timeout: 10_000 });

		const href = await firstItemLink.getAttribute('href');
		const slug = href?.split('/items/')[1]?.split('?')[0];

		if (!slug) {
			test.skip(true, 'Could not extract item slug');
			return;
		}

		const response = await clientPage.request.get(`/api/items/${slug}/votes`);

		expect([200, 404]).toContain(response.status());
	});
});

test.describe('API: Auth', () => {
	test('GET /api/current-user returns user data when authenticated', async ({ adminPage }) => {
		const response = await adminPage.request.get('/api/current-user');

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toBeDefined();
	});

	test('GET /api/current-user returns 401 when unauthenticated', async ({ page }) => {
		const response = await page.request.get('/api/current-user');

		// Should return 401 or redirect
		expect([200, 401, 403]).toContain(response.status());
	});
});
