import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/admin/**` and `/dashboard/**` page routes:
 * an unauthenticated visitor must be redirected (typically to
 * `/auth/signin` or `/admin/auth/signin`) instead of receiving a
 * server error.
 *
 * The contract enforced here is "non-5xx". The landing URL after
 * the redirect can vary by build (signin vs auth-error), so we only
 * assert that the response status is below 500.
 */
const PROTECTED_PAGES = [
	'/admin',
	'/admin/items',
	'/admin/users',
	'/admin/categories',
	'/admin/tags',
	'/admin/collections',
	'/admin/comments',
	'/admin/companies',
	'/admin/featured-items',
	'/admin/reports',
	'/admin/roles',
	'/admin/settings',
	'/admin/sponsorships',
	'/admin/surveys',
	'/admin/surveys/create',
	'/admin/clients',
	'/dashboard',
	'/dashboard/items',
] as const;

test.describe('Public: Admin / dashboard pages reject anonymous visitors', () => {
	for (const path of PROTECTED_PAGES) {
		test(`GET ${path} responds without a server error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
