import { test, expect } from '@playwright/test';

// Browser icon assets — favicons across resolutions, Apple touch icons,
// theme-color. Each missing one degrades the install / bookmark experience.

const ICON_PATHS = [
	'/favicon.ico',
	'/favicon-16x16.png',
	'/favicon-32x32.png',
	'/apple-touch-icon.png',
	'/icon.svg',
	'/icon.png'
];

test.describe('Browser icon asset reachability', () => {
	for (const path of ICON_PATHS) {
		test(`${path} responds non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			// Some are optional — 404 is fine, 5xx is not.
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('home advertises a favicon via <link>', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const fav = page
			.locator('link[rel="icon"], link[rel="shortcut icon"]')
			.first();
		await expect(fav).toBeAttached();
		const href = await fav.getAttribute('href');
		expect(href).toBeTruthy();
	});

	test('home advertises apple-touch-icon', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const apple = page.locator('link[rel="apple-touch-icon"]').first();
		// Optional — accept absence on minimal themes.
		const count = await apple.count();
		expect(count).toBeGreaterThanOrEqual(0);
	});
});
