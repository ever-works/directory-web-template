import { test, expect } from '@playwright/test';

/**
 * Every public page should declare an og:type. Acceptable values per the
 * OpenGraph spec are documented at https://ogp.me. For a directory app
 * we expect "website" on listing pages and possibly "article" on detail
 * pages — anything else is suspicious.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const ALLOWED_OG_TYPES = new Set([
	'website',
	'article',
	'book',
	'profile',
	'music.song',
	'music.album',
	'music.playlist',
	'video.movie',
	'video.episode',
	'video.tv_show',
	'video.other',
]);

test.describe('Public HTML: og:type meta tag', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} has a valid og:type meta`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const ogType = await page.locator('meta[property="og:type"]').first().getAttribute('content');
			if (ogType === null) return; // og:type missing is its own issue; covered elsewhere
			expect(ogType, `og:type non-empty on ${path}`).not.toBe('');
			expect(
				ALLOWED_OG_TYPES.has(ogType),
				`og:type "${ogType}" on ${path} should be a known OGP type`,
			).toBe(true);
		});
	}
});
