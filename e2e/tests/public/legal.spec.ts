import { test, expect } from '@playwright/test';

const LEGAL_PAGES = [
	{ path: '/privacy-policy', name: 'Privacy Policy' },
	{ path: '/terms-of-service', name: 'Terms of Service' },
	{ path: '/cookies', name: 'Cookies' },
] as const;

test.describe('Public: Legal Pages', () => {
	for (const legalPage of LEGAL_PAGES) {
		test(`${legalPage.name} page loads with content`, async ({ page }) => {
			const response = await page.goto(legalPage.path);

			expect(response?.status()).toBeLessThan(400);
			await expect(page.locator('body')).toBeVisible();
			await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		});
	}
});
