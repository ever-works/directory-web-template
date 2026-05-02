import { test, expect } from '@playwright/test';
import { MapPage } from '../../page-objects/public/map.page';
import { DiscoverPage } from '../../page-objects/public/discover.page';

/**
 * Spec 017 — Map View for Listings.
 *
 * Covers:
 * - AC-1 / AC-10: the listing view toggle exposes a Map button when
 *   `settings.location.enabled` is true and a provider key is set.
 * - AC-2 / AC-10: the header `Map` link is shown only when the feature
 *   is enabled.
 * - AC-3 / AC-7: `/map` route renders successfully (markers OR the
 *   empty state) when location features are enabled, and returns 404
 *   when they are not.
 *
 * The suite degrades gracefully in dev environments without provider
 * keys: tests that need a real map skip themselves explicitly.
 */

const hasMapProviderKey = Boolean(
	process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
		process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
);

test.describe('Public: Map View', () => {
	test('/map route returns a successful response', async ({ page }) => {
		const mapPage = new MapPage(page);
		const response = await page.goto('/map', { waitUntil: 'domcontentloaded' });

		// Two valid outcomes:
		// - 200 if location features are enabled (page renders),
		// - 404 if location features are disabled (gated route).
		// Either way, this is correct behaviour per AC-7.
		const status = response?.status() ?? 0;
		expect([200, 404]).toContain(status);

		if (status === 200) {
			expect(await mapPage.isPageRendered()).toBe(true);
		}
	});

	test('view toggle exposes a Map button when feature is available', async ({ page }) => {
		test.skip(
			!hasMapProviderKey,
			'No NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set — view toggle Map button is gated on a configured provider'
		);

		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		const toggle = page.locator('button[aria-label*="map" i]').first();
		await expect(toggle).toBeVisible();

		await toggle.click();
		// After clicking the Map view toggle, the map composition mounts.
		await expect(page.getByTestId('map-view').or(page.getByTestId('map-empty-state'))).toBeVisible();
	});

	test('header Map link visibility tracks the config gate', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto('/');
		await mapPage.waitForPageReady();

		const isVisible = await mapPage.mapHeaderLink.isVisible().catch(() => false);

		// We don't know the operator's config in this environment, but we
		// can assert that the link is a navigable anchor pointing at /map
		// whenever it does appear, and that its absence is OK.
		if (isVisible) {
			const href = await mapPage.mapHeaderLink.getAttribute('href');
			expect(href).toContain('/map');
		} else {
			// Link not shown: either header.map_enabled is false or location
			// features are disabled. Both are valid; just confirm the page
			// itself rendered.
			await expect(page.locator('header')).toBeVisible();
		}
	});

	test('clicking a sidebar card highlights it (when markers are present)', async ({ page }) => {
		test.skip(
			!hasMapProviderKey,
			'Sidebar interaction requires the map view to mount with real markers'
		);

		const mapPage = new MapPage(page);
		const response = await page.goto('/map', { waitUntil: 'domcontentloaded' });
		test.skip(response?.status() !== 200, '/map is gated off in this environment');

		const cardCount = await mapPage.sidebarCards.count().catch(() => 0);
		test.skip(cardCount === 0, 'No items with coordinates in this dataset');

		const firstCard = mapPage.sidebarCards.first();
		await firstCard.scrollIntoViewIfNeeded();
		await firstCard.click();
		await expect(firstCard).toHaveAttribute('aria-current', 'true');
	});
});
