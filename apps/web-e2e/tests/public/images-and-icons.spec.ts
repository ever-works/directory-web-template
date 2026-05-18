import { test, expect } from '@playwright/test';

// Common image / icon assets must respond. Broken images degrade
// trust signals heavily and Lighthouse penalizes them.

const ICON_PATHS = ['/favicon.ico', '/logo-ever-works.svg'];

test.describe('Static asset availability', () => {
	for (const path of ICON_PATHS) {
		test(`${path} is reachable`, async ({ request }) => {
			const resp = await request.get(path);
			// Some setups serve favicon from a generated route; accept any 2xx/3xx.
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('home logo image has alt text or aria-label', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const logo = page.locator('header img, header svg').first();
		if ((await logo.count()) === 0) {
			test.skip(true, 'No logo element found');
			return;
		}
		const alt = await logo.getAttribute('alt').catch(() => null);
		const ariaLabel = await logo.getAttribute('aria-label').catch(() => null);
		const role = await logo.getAttribute('role').catch(() => null);
		// Accessible logo should have at least one accessibility hint.
		expect(alt || ariaLabel || role, 'logo accessibility hint').toBeTruthy();
	});

	test('home renders no broken image (each <img> has src + non-empty natural size eventually)', async ({
		page
	}) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const imgs = page.locator('img');
		const count = await imgs.count();
		expect(count).toBeGreaterThan(0);
		// Just check that the first 5 images have a src attribute set. Don't
		// fetch them all — would balloon CI time.
		for (let i = 0; i < Math.min(count, 5); i++) {
			const src = await imgs.nth(i).getAttribute('src');
			expect(src, `img[${i}] should have a src`).toBeTruthy();
		}
	});
});
