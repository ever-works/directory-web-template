import { test, expect, devices } from '@playwright/test';

// Mobile viewport rendering. Catches regressions where a page renders
// fine on desktop but blows up on small screens (overflow, hidden nav,
// hydration mismatch).

// `defaultBrowserType` is worker-scoped — Playwright rejects it inside a
// describe — and CI only installs chromium so we must not switch the
// browser. Strip it from both device spreads and keep only page-scoped
// fields (viewport, isMobile, hasTouch, userAgent, …).
const { defaultBrowserType: _omitMobileDBT, ...MOBILE_DEVICE } =
	devices['iPhone 14'] || devices['iPhone 13'];
void _omitMobileDBT;
const { defaultBrowserType: _omitTabletDBT, ...TABLET_DEVICE } =
	devices['iPad Pro 11'] || devices['iPad Pro 11 (gen 2)'] || devices['iPad Pro'];
void _omitTabletDBT;

test.describe('Mobile viewport rendering', () => {
	test.use(MOBILE_DEVICE);

	for (const path of ['/', '/about', '/auth/signin', '/categories']) {
		test(`mobile ${path} renders without horizontal overflow`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp!.status()).toBeLessThan(500);

			const overflow = await page.evaluate(() => {
				return document.documentElement.scrollWidth > window.innerWidth + 5; // 5px tolerance
			});
			expect(overflow, `${path}: should not horizontally overflow on mobile`).toBe(false);
		});
	}

	test('mobile signin form inputs are tappable (min target size)', async ({ page }) => {
		await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		const email = page.locator('#email');
		const box = await email.boundingBox();
		expect(box, 'email input bbox').toBeTruthy();
		// WCAG suggests 44x44 minimum tap target — we use 36 as a tolerant floor.
		expect(box!.height, 'email input tap height').toBeGreaterThanOrEqual(36);
	});
});

test.describe('Tablet viewport rendering', () => {
	test.use(TABLET_DEVICE);

	test('tablet home renders without horizontal overflow', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth + 5
		);
		expect(overflow).toBe(false);
	});
});
