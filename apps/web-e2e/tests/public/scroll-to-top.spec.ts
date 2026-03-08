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

		const scrollToTop = new ScrollToTop(page);

		// Scroll down past the threshold (300px default)
		await scrollToTop.scrollDown(500);
		await page.waitForTimeout(500);

		await expect(scrollToTop.button).toBeVisible({ timeout: 5_000 });
	});

	test('clicking scroll-to-top scrolls the page to the top', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const scrollToTop = new ScrollToTop(page);

		// Scroll down
		await scrollToTop.scrollDown(800);
		await page.waitForTimeout(500);

		// Verify we scrolled
		const scrollAfterDown = await scrollToTop.getScrollY();
		expect(scrollAfterDown).toBeGreaterThan(0);

		// Click scroll-to-top
		await expect(scrollToTop.button).toBeVisible({ timeout: 5_000 });
		await scrollToTop.click();

		// Wait for scroll animation
		await page.waitForTimeout(1_000);

		// Should be near the top
		const scrollAfterClick = await scrollToTop.getScrollY();
		expect(scrollAfterClick).toBeLessThan(50);
	});
});
