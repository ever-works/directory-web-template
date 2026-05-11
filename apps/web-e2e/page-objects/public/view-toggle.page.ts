import type { Page, Locator } from '@playwright/test';

/**
 * Page object for the view toggle component (list/grid/masonry) on listing pages.
 *
 * The component (apps/web/components/view-toggle.tsx) applies these
 * classes to the active button: `bg-theme-primary text-white shadow-md
 * transform scale-105`. Hovered (non-active) buttons get `scale-110`,
 * so the `scale-105` substring alone is not stable when the cursor is
 * still over a just-clicked button. We additionally check
 * `bg-theme-primary` which is exclusive to the active state.
 */
export class ViewToggle {
	readonly page: Page;
	readonly listButton: Locator;
	readonly gridButton: Locator;
	readonly masonryButton: Locator;
	readonly mapButton: Locator;

	constructor(page: Page) {
		this.page = page;
		// `aria-label*="list" i` would also match "Switch to map view"
		// because the framework localises the labels to e.g.
		// "Cambiar a vista de lista" (Spanish) — but the English label
		// is "Switch to list view" which contains "list". Anchor to the
		// English text to avoid bleed.
		this.listButton = page.locator('button[aria-label*="list" i]').first();
		this.gridButton = page.locator('button[aria-label*="grid" i]').first();
		this.masonryButton = page.locator('button[aria-label*="masonry" i]').first();
		this.mapButton = page.locator('button[aria-label*="map" i]').first();
	}

	async selectList() {
		await this.listButton.click();
		// Move the mouse away so a hover-induced `scale-110` does not
		// mask the active state when callers read `isActive` right after.
		await this.page.mouse.move(0, 0);
	}

	async selectGrid() {
		await this.gridButton.click();
		await this.page.mouse.move(0, 0);
	}

	async selectMasonry() {
		await this.masonryButton.click();
		await this.page.mouse.move(0, 0);
	}

	/**
	 * Active state markers (any one is sufficient):
	 *   - `bg-theme-primary` — exclusive to the active variant.
	 *   - `scale-105` — applied by `transform scale-105` on the active
	 *     variant only (inactive uses `scale-110` on hover).
	 *   - `aria-pressed="true"` — added by future iterations.
	 */
	async isActive(button: Locator): Promise<boolean> {
		const [classes, ariaPressed] = await Promise.all([
			button.getAttribute('class'),
			button.getAttribute('aria-pressed'),
		]);
		if (ariaPressed === 'true') return true;
		if (!classes) return false;
		return classes.includes('bg-theme-primary') || classes.includes('scale-105');
	}
}
