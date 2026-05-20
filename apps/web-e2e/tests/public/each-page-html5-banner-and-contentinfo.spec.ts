import { test, expect } from '@playwright/test';

/**
 * Each public page should have at most one banner landmark (<header>
 * not nested in main/article/section) and at most one contentinfo
 * landmark (<footer> not nested in main/article/section). Multiple
 * top-level banner/contentinfo regions cause screen-reader confusion.
 *
 * Counting heuristic: count <header> and <footer> at the document
 * level (excluding ones inside <main>, <article>, <section>, <aside>).
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

test.describe('Public HTML: banner + contentinfo landmark uniqueness', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} has at most one top-level banner and contentinfo`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const banners = await page.evaluate(() => {
				const elements = Array.from(document.querySelectorAll('header, [role="banner"]')) as HTMLElement[];
				return elements.filter(
					(el) => !el.closest('main, article, section, aside') || el.matches('[role="banner"]')
				).length;
			});
			const contentinfos = await page.evaluate(() => {
				const elements = Array.from(document.querySelectorAll('footer, [role="contentinfo"]')) as HTMLElement[];
				return elements.filter(
					(el) => !el.closest('main, article, section, aside') || el.matches('[role="contentinfo"]')
				).length;
			});
			expect(banners, `top-level banners on ${path}`).toBeLessThanOrEqual(1);
			expect(contentinfos, `top-level contentinfos on ${path}`).toBeLessThanOrEqual(1);
		});
	}
});
