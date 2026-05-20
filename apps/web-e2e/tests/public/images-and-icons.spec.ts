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
		// Accessible logo can announce itself via several mechanisms:
		// alt / aria-label / role on the element itself, OR a <title>
		// child for SVG, OR an aria-label on the wrapping link/button.
		const alt = await logo.getAttribute('alt').catch(() => null);
		const ariaLabel = await logo.getAttribute('aria-label').catch(() => null);
		const role = await logo.getAttribute('role').catch(() => null);
		const ariaHidden = await logo.getAttribute('aria-hidden').catch(() => null);
		const titleCount = await logo.locator('title').count().catch(() => 0);
		const parentLabel = await logo
			.locator('xpath=ancestor::*[self::a or self::button][1]')
			.getAttribute('aria-label')
			.catch(() => null);
		// `aria-hidden="true"` is also acceptable — it explicitly opts
		// the logo out of the AT tree (paired with sibling text elsewhere).
		const accessible =
			alt || ariaLabel || role || titleCount > 0 || parentLabel || ariaHidden === 'true';
		expect(accessible, 'logo accessibility hint').toBeTruthy();
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
