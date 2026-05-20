import { test, expect } from '@playwright/test';

/**
 * twitter:card values are strictly enumerated. Anything outside the
 * recognised set is silently ignored by Twitter/X — so a typo means
 * the card preview is broken even though the meta tag is present.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const ALLOWED_CARDS = new Set(['summary', 'summary_large_image', 'app', 'player']);

test.describe('Public HTML: twitter:card meta tag', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} twitter:card is a recognised value if present`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const cardValue = await page
				.locator('meta[name="twitter:card"]')
				.first()
				.getAttribute('content');
			if (cardValue === null) return;
			expect(cardValue, `twitter:card non-empty on ${path}`).not.toBe('');
			expect(
				ALLOWED_CARDS.has(cardValue.trim().toLowerCase()),
				`twitter:card "${cardValue}" on ${path} should be summary | summary_large_image | app | player`,
			).toBe(true);
		});
	}
});
