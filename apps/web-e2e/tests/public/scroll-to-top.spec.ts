import { test, expect } from '../../fixtures';
import { ScrollToTop } from '../../page-objects/public/scroll-to-top.page';

test.describe('UI: Scroll to Top Button', () => {
	test('scroll-to-top button is hidden at the top of the page', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const scrollToTop = new ScrollToTop(page);

		// At the top, button should not be visible
		await expect(scrollToTop.button).toBeHidden({ timeout: 5_000 });
	});

	test('scroll-to-top button appears after scrolling down', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		// Wait for first-paint to settle; the throttled scroll listener
		// only attaches after hydration.
		await page.waitForLoadState('networkidle').catch(() => undefined);

		const scrollToTop = new ScrollToTop(page);
		// Conditional-layout configures `showAfter={400}` — scroll well
		// past that, and skip when the seed page is genuinely too short
		// to scroll past the threshold.
		await scrollToTop.scrollDown(1200);
		const scrolled = await scrollToTop.getScrollY();
		test.skip(scrolled < 400, `page too short to scroll past 400px threshold (scrollY=${scrolled})`);

		await expect(scrollToTop.button).toBeVisible({ timeout: 7_000 });
	});

	test('clicking scroll-to-top scrolls the page to the top', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.waitForLoadState('networkidle').catch(() => undefined);

		const scrollToTop = new ScrollToTop(page);

		// Scroll down
		await scrollToTop.scrollDown(1200);

		// Verify we scrolled past the threshold; skip on too-short pages.
		const scrollAfterDown = await scrollToTop.getScrollY();
		test.skip(scrollAfterDown < 400, `page too short to scroll past threshold (scrollY=${scrollAfterDown})`);
		expect(scrollAfterDown).toBeGreaterThan(0);

		// Click scroll-to-top
		await expect(scrollToTop.button).toBeVisible({ timeout: 7_000 });
		await scrollToTop.click();

		// Wait for scroll animation
		await page.waitForTimeout(1_500);

		// Should be near the top
		const scrollAfterClick = await scrollToTop.getScrollY();
		expect(scrollAfterClick).toBeLessThan(50);
	});
});
