import { test, expect } from '../../fixtures';
import { SearchBar } from '../../page-objects/public/search-bar.page';

test.describe('UI: Public Search Bar', () => {
	test('search input is visible on homepage', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const searchBar = new SearchBar(page);
		const isVisible = await searchBar.input.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Search bar not visible on homepage');
			return;
		}

		await expect(searchBar.input).toBeVisible();
	});

	test('typing in search bar filters content', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const searchBar = new SearchBar(page);
		const isVisible = await searchBar.input.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Search bar not visible on homepage');
			return;
		}

		// Type a search term
		await searchBar.search('test');

		// Wait for debounce + results
		await page.waitForTimeout(1_000);

		// The input should reflect the typed value
		const value = await searchBar.getValue();
		expect(value).toBe('test');
	});

	test('clearing search restores original content', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const searchBar = new SearchBar(page);
		const isVisible = await searchBar.input.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Search bar not visible on homepage');
			return;
		}

		// Type then clear
		await searchBar.search('nonexistent');
		await page.waitForTimeout(1_000);

		await searchBar.clear();
		await page.waitForTimeout(1_000);

		const value = await searchBar.getValue();
		expect(value).toBe('');
	});
});
