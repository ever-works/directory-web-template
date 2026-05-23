import { test, expect } from '@playwright/test';

/**
 * <link rel="icon"> presence and href shape. Every page should have a
 * usable favicon link — either explicitly declared (preferred) or
 * implicitly via /favicon.ico (acceptable). The declared link must
 * have a non-empty href that is either an absolute URL or starts with
 * '/'.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

test.describe('Public HTML: <link rel="icon"> href shape', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} link[rel*="icon"] hrefs are well-formed when present`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const iconLinks = page.locator('link[rel*="icon"]');
			const count = await iconLinks.count();
			if (count === 0) return; // implicit /favicon.ico is fine
			for (let i = 0; i < count; i++) {
				const href = await iconLinks.nth(i).getAttribute('href');
				expect(href, `icon link[${i}] href on ${path}`).not.toBeNull();
				expect((href ?? '').trim(), `icon href non-empty on ${path}`).not.toBe('');
				expect(
					/^(https?:\/\/|\/|data:image\/)/.test((href ?? '').trim()),
					`icon href "${href}" on ${path} should be absolute, root-relative, or data:image/`,
				).toBe(true);
			}
		});
	}
});
