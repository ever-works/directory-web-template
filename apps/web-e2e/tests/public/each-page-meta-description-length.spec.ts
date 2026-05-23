import { test, expect } from '@playwright/test';

/**
 * If a page sets a meta description, it should be within a sensible
 * length range. Google typically displays 50-160 characters in SERPs;
 * descriptions outside 20-300 are either too short to be useful or
 * truncated junk.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const MIN_LEN = 20;
const MAX_LEN = 300;

test.describe('Public HTML: meta description length', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} meta description is within ${MIN_LEN}-${MAX_LEN} chars if present`, async ({
			page,
		}) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const desc = await page.locator('meta[name="description"]').first().getAttribute('content');
			if (desc === null) return;
			const trimmed = desc.trim();
			expect(trimmed.length, `length(meta description) on ${path}`).toBeGreaterThanOrEqual(MIN_LEN);
			expect(trimmed.length, `length(meta description) on ${path}`).toBeLessThanOrEqual(MAX_LEN);
		});
	}
});
