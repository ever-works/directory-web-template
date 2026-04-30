import type { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the Map View feature (Spec 017).
 *
 * Wraps:
 * - the dedicated `/map` route,
 * - the listing-page view-toggle Map button, and
 * - the header `Map` navigation link.
 */
export class MapPage extends BasePage {
	readonly mapView: Locator;
	readonly mapEmptyState: Locator;
	readonly mapSidebar: Locator;
	readonly sidebarCards: Locator;
	readonly mapHeaderLink: Locator;
	readonly viewToggleMapButton: Locator;
	readonly showMapButton: Locator;
	readonly showListButton: Locator;

	constructor(page: Page) {
		super(page);
		this.mapView = page.getByTestId('map-view');
		this.mapEmptyState = page.getByTestId('map-empty-state');
		this.mapSidebar = page.getByTestId('map-sidebar');
		this.sidebarCards = page.getByTestId('map-sidebar-card');
		// The header Map link uses translation `HEADER_MAP` -> "Map" in en.
		this.mapHeaderLink = this.header.getByRole('link', { name: /^Map$/ });
		this.viewToggleMapButton = page.locator('button[aria-label*="map" i]').first();
		this.showMapButton = page.getByRole('button', { name: /show map/i });
		this.showListButton = page.getByRole('button', { name: /show list/i });
	}

	/** Navigate to the dedicated /map route. */
	async navigate() {
		await this.goto('/map');
	}

	/**
	 * Whether the page rendered successfully — we treat either the map view
	 * or the empty state as "ok" because in dev environments without
	 * provider keys / coordinates we expect the empty path.
	 */
	async isPageRendered(): Promise<boolean> {
		const view = await this.mapView.first().isVisible().catch(() => false);
		const empty = await this.mapEmptyState.first().isVisible().catch(() => false);
		return view || empty;
	}
}
