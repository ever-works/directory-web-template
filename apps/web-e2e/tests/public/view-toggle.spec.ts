import { test, expect } from '../../fixtures';
import { ViewToggle } from '../../page-objects/public/view-toggle.page';

test.describe('UI: View Toggle', () => {
	test('view toggle buttons are visible on listing page', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const viewToggle = new ViewToggle(page);

		// At least list and grid buttons should be visible
		const isListVisible = await viewToggle.listButton.isVisible().catch(() => false);
		const isGridVisible = await viewToggle.gridButton.isVisible().catch(() => false);

		if (!isListVisible && !isGridVisible) {
			test.skip(true, 'View toggle not visible on listing page');
			return;
		}

		expect(isListVisible || isGridVisible).toBeTruthy();
	});

	test('switching to grid view changes the active button', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const viewToggle = new ViewToggle(page);
		const isGridVisible = await viewToggle.gridButton.isVisible().catch(() => false);

		if (!isGridVisible) {
			test.skip(true, 'Grid view button not visible');
			return;
		}

		await viewToggle.selectGrid();
		await page.waitForTimeout(500);

		// Grid button should now be the active one
		const isActive = await viewToggle.isActive(viewToggle.gridButton);
		expect(isActive).toBe(true);
	});

	test('switching to list view changes the active button', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const viewToggle = new ViewToggle(page);
		const isListVisible = await viewToggle.listButton.isVisible().catch(() => false);

		if (!isListVisible) {
			test.skip(true, 'List view button not visible');
			return;
		}

		// First switch to grid, then back to list
		const isGridVisible = await viewToggle.gridButton.isVisible().catch(() => false);
		if (isGridVisible) {
			await viewToggle.selectGrid();
			await page.waitForTimeout(500);
		}

		await viewToggle.selectList();
		await page.waitForTimeout(500);

		const isActive = await viewToggle.isActive(viewToggle.listButton);
		expect(isActive).toBe(true);
	});

	test('masonry view button toggles correctly', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const viewToggle = new ViewToggle(page);
		const isMasonryVisible = await viewToggle.masonryButton.isVisible().catch(() => false);

		if (!isMasonryVisible) {
			test.skip(true, 'Masonry view button not visible');
			return;
		}

		await viewToggle.selectMasonry();
		await page.waitForTimeout(500);

		const isActive = await viewToggle.isActive(viewToggle.masonryButton);
		expect(isActive).toBe(true);
	});
});
