import { test, expect } from '@playwright/test';

// The demo account banner (apps/web/components/layout/demo-banner.tsx): the strip above the header of a demo
// deployment. The e2e build runs with NEXT_PUBLIC_DEMO=true (e2e.yml), so this suite is a demo deployment. The banner
// follows the RUNTIME flag from GET /api/payment/public-config: a directory whose pod env says demo=false shows
// nothing, whatever the bundle was built with.

const PUBLIC_CONFIG = '**/api/payment/public-config';

test.describe('Demo account banner', () => {
	test('a demo deployment shows the notice and the Ever Works sign-up link above the header', async ({ page }) => {
		const config = await page.request.get('/api/payment/public-config');
		expect(config.ok()).toBe(true);
		expect((await config.json()).demo, 'the e2e server runs with NEXT_PUBLIC_DEMO=true').toBe(true);

		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const banner = page.getByTestId('demo-banner');
		await expect(banner).toBeVisible();
		await expect(banner).toContainText('You are using a demo account.');
		const link = banner.getByRole('link');
		await expect(link).toHaveAttribute('href', 'https://app.ever.works/register');

		// Above the header (the HeroUI navbar), not inside or below it.
		const header = page.locator('nav, header').first();
		const [bannerBox, headerBox] = await Promise.all([banner.boundingBox(), header.boundingBox()]);
		expect(bannerBox, 'banner box').toBeTruthy();
		expect(headerBox, 'header box').toBeTruthy();
		expect(bannerBox!.y).toBeLessThan(headerBox!.y);
	});

	test('the runtime flag decides: demo=false from the server hides the banner', async ({ page }) => {
		await page.route(PUBLIC_CONFIG, async (route) => {
			const response = await route.fetch();
			const body = await response.json();
			await route.fulfill({ response, json: { ...body, demo: false } });
		});

		await page.goto('/', { waitUntil: 'domcontentloaded' });

		await expect(page.getByTestId('demo-banner')).toHaveCount(0);
	});

	test('no runtime answer, no banner: a failed config request does not fall back to the build-time flag', async ({
		page
	}) => {
		// The e2e bundle is built with NEXT_PUBLIC_DEMO=true, so this proves the banner waits for a successful answer.
		await page.route(PUBLIC_CONFIG, (route) => route.abort());
		const failed = page.waitForEvent('requestfailed', (request) =>
			request.url().includes('/api/payment/public-config')
		);

		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await failed;

		await expect(page.getByTestId('demo-banner')).toHaveCount(0);
	});
});
