import { test, expect } from '@playwright/test';

/**
 * UX contract for the home-page categories sidebar (filter mode):
 *
 *   - Plain click on category B = single-select. Switches the selection
 *     to just B (replacing whatever was selected).
 *   - Ctrl / Cmd / Shift + click on B = multi-select. Toggles B in/out
 *     of the existing selection — multiple categories can stack.
 *   - Click on "All Categories" = clear.
 *
 * The default-multi behaviour was the legacy implementation; this spec
 * pins the post-fix UX. Modifier-key detection happens in
 * `category-item.tsx::handleClick` and is honoured by both
 * `categories-list.tsx::handleCategoryToggle` and
 * `categories-section.tsx::handleCategoryToggle`.
 */

const PAGE_READY_TIMEOUT = 15_000;

async function gotoHome(page: import('@playwright/test').Page) {
	await page.goto('/', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	// Hydration time for the filter sidebar.
	await page.waitForTimeout(2_000);
}

/**
 * Yields the visible category buttons in the desktop filter sidebar
 * (filter mode). Returns at most `limit` accessible names.
 */
async function getCategoryButtonNames(page: import('@playwright/test').Page, limit: number): Promise<string[]> {
	// `aria-pressed` is only present on the filter-mode buttons (see
	// `category-item.tsx`), so this selector excludes the navigation links
	// served on `/categories`.
	const buttons = page.locator('button[aria-pressed]');
	const count = await buttons.count();
	if (count === 0) return [];
	const names: string[] = [];
	for (let i = 0; i < Math.min(count, limit); i++) {
		const name = await buttons.nth(i).getAttribute('aria-label');
		if (name) names.push(name);
	}
	return names;
}

test.describe('Public: Categories sidebar — single-click vs modifier-key multi-select', () => {
	test('plain click selects exactly one category (and clicking another switches selection)', async ({ page }) => {
		await gotoHome(page);

		const candidates = await getCategoryButtonNames(page, 5);
		// Need at least 3 candidates: "All Categories" + two real categories.
		test.skip(candidates.length < 3, 'Filter-mode categories sidebar not present (or fewer than 2 categories)');

		// Skip the "All Categories" entry — pick the first two real categories.
		const buttons = page.locator('button[aria-pressed]');
		const allCategoriesIdx = (await buttons.allTextContents()).findIndex((t) =>
			/all categories/i.test(t)
		);

		const firstRealIdx = allCategoriesIdx === 0 ? 1 : 0;
		const secondRealIdx = allCategoriesIdx === 0 ? 2 : allCategoriesIdx === 1 ? 0 : 1;

		const firstButton = buttons.nth(firstRealIdx);
		const secondButton = buttons.nth(secondRealIdx);

		// Plain click first category.
		await firstButton.click();
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('true');
		expect(await secondButton.getAttribute('aria-pressed')).toBe('false');

		// Plain click second category — should REPLACE selection, not add.
		await secondButton.click();
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('false');
		expect(await secondButton.getAttribute('aria-pressed')).toBe('true');
	});

	test('Ctrl+click adds a second category to the selection (multi-select)', async ({ page }) => {
		await gotoHome(page);

		const candidates = await getCategoryButtonNames(page, 5);
		test.skip(candidates.length < 3, 'Filter-mode categories sidebar not present (or fewer than 2 categories)');

		const buttons = page.locator('button[aria-pressed]');
		const allCategoriesIdx = (await buttons.allTextContents()).findIndex((t) =>
			/all categories/i.test(t)
		);
		const firstRealIdx = allCategoriesIdx === 0 ? 1 : 0;
		const secondRealIdx = allCategoriesIdx === 0 ? 2 : allCategoriesIdx === 1 ? 0 : 1;

		const firstButton = buttons.nth(firstRealIdx);
		const secondButton = buttons.nth(secondRealIdx);

		// Plain click → single-select first category.
		await firstButton.click();
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('true');

		// Ctrl+click second → BOTH should now be active.
		await secondButton.click({ modifiers: ['Control'] });
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('true');
		expect(await secondButton.getAttribute('aria-pressed')).toBe('true');
	});

	test('Shift+click on the only-selected category deselects it', async ({ page }) => {
		await gotoHome(page);

		const candidates = await getCategoryButtonNames(page, 5);
		test.skip(candidates.length < 2, 'Filter-mode categories sidebar not present');

		const buttons = page.locator('button[aria-pressed]');
		const allCategoriesIdx = (await buttons.allTextContents()).findIndex((t) =>
			/all categories/i.test(t)
		);
		const firstRealIdx = allCategoriesIdx === 0 ? 1 : 0;
		const firstButton = buttons.nth(firstRealIdx);

		await firstButton.click();
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('true');

		// Shift+click while it's the only selection should clear it.
		await firstButton.click({ modifiers: ['Shift'] });
		await page.waitForTimeout(500);
		expect(await firstButton.getAttribute('aria-pressed')).toBe('false');
	});

	test('clicking "All Categories" clears any active selection', async ({ page }) => {
		await gotoHome(page);

		const buttons = page.locator('button[aria-pressed]');
		const texts = await buttons.allTextContents();
		const allIdx = texts.findIndex((t) => /all categories/i.test(t));
		test.skip(allIdx < 0, '"All Categories" button not present');

		// Ensure another category is selected first.
		const realIdx = allIdx === 0 ? 1 : 0;
		test.skip(await buttons.count() <= realIdx, 'Need at least one real category');

		await buttons.nth(realIdx).click();
		await page.waitForTimeout(500);
		expect(await buttons.nth(realIdx).getAttribute('aria-pressed')).toBe('true');

		await buttons.nth(allIdx).click();
		await page.waitForTimeout(500);
		expect(await buttons.nth(realIdx).getAttribute('aria-pressed')).toBe('false');
		expect(await buttons.nth(allIdx).getAttribute('aria-pressed')).toBe('true');
	});
});
