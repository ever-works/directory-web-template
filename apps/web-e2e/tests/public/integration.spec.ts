import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public `/integration/**` showcase pages
 * documenting third-party analytics integrations bundled with the
 * template (Vercel Analytics, PostHog, Speed Insights). Each must
 * render without a server error.
 */
const INTEGRATION_PAGES = [
	{ path: '/integration/analytics', name: 'Vercel Analytics' },
	{ path: '/integration/posthog', name: 'PostHog' },
	{ path: '/integration/speed-insights', name: 'Speed Insights' },
] as const;

test.describe('Public: Integration showcase pages', () => {
	for (const integration of INTEGRATION_PAGES) {
		test(`${integration.name} page renders`, async ({ page }) => {
			const response = await page.goto(integration.path, {
				waitUntil: 'domcontentloaded',
			});

			// Accept 200 / 404 — some integrations may be feature-gated.
			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
