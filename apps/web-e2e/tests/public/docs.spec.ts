import { test, expect } from '@playwright/test';

test.describe('Public: Docs landing page', () => {
	test('/docs renders successfully', async ({ page }) => {
		const response = await page.goto('/docs', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('/docs exposes a primary heading', async ({ page }) => {
		await page.goto('/docs', { waitUntil: 'domcontentloaded' });

		const heading = page.getByRole('heading', { level: 1 }).first();
		await expect(heading).toBeVisible();
	});

	test('/docs embeds the Scalar API reference in a same-origin iframe that actually loads', async ({ page }) => {
		await page.goto('/docs', { waitUntil: 'domcontentloaded' });

		// The page renders <iframe src="/api/reference">. Until spec 043 the global
		// `X-Frame-Options: DENY` / `frame-ancestors 'none'` headers made the browser
		// refuse to render that document, so /docs showed an empty "blocked" frame.
		const iframe = page.locator('iframe[title="API Reference"]');
		await expect(iframe).toHaveAttribute('src', '/api/reference');

		// Browser-level check (not just response headers): the framed document must
		// navigate to /api/reference and mount Scalar's `#app` root. `#app` is part of
		// the HTML served by @scalar/nextjs-api-reference itself, so this does not
		// depend on the jsDelivr bundle being reachable from CI.
		const frame = iframe.contentFrame();
		await expect(frame.locator('#app')).toBeAttached({ timeout: 30_000 });
		const frameUrl = await iframe.evaluate((el) => (el as HTMLIFrameElement).contentWindow?.location.pathname ?? '');
		expect(frameUrl).toBe('/api/reference');
	});
});
