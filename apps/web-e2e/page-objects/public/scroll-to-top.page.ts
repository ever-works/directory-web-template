import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the scroll-to-top button.
 */
export class ScrollToTop {
	readonly page: Page;
	readonly button: Locator;

	constructor(page: Page) {
		this.page = page;
		this.button = page.locator('button[aria-label="Scroll to top"]');
	}

	/** Scroll down to trigger the button to appear. Wait for the page
	 *  to actually have enough content to scroll first, then use
	 *  scrollTo (absolute) so the result is deterministic regardless of
	 *  where the page currently is. */
	async scrollDown(pixels = 500) {
		// Wait until the document is at least `pixels + viewport` tall —
		// on minimal-data seeds the listing can render before its tall
		// children mount, and scrolling on a short doc silently does
		// nothing. Cap the wait so the test still fails fast on a truly
		// short page.
		await this.page
			.waitForFunction(
				([px]) => document.documentElement.scrollHeight > (px as number) + window.innerHeight,
				[pixels] as const,
				{ timeout: 3_000 }
			)
			.catch(() => {
				/* page may legitimately be shorter — fall through */
			});
		await this.page.evaluate((px) => window.scrollTo({ top: px, behavior: 'instant' as ScrollBehavior }), pixels);
	}

	/** Click the scroll-to-top button */
	async click() {
		await this.button.click();
	}

	/** Get current scroll position */
	async getScrollY(): Promise<number> {
		return this.page.evaluate(() => window.scrollY);
	}
}
