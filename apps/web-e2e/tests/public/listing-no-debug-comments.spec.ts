import { test, expect } from '@playwright/test';

/**
 * Production HTML should not contain debug/in-progress comment markers.
 * These leak intent / future work to attackers and crawlers, and
 * indicate the build is shipping un-cleaned source.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const DEBUG_COMMENT_PATTERNS = [
	/<!--\s*TODO\b/i,
	/<!--\s*FIXME\b/i,
	/<!--\s*XXX\b/i,
	/<!--\s*HACK\b/i,
	/<!--\s*DEBUG\b/i,
	/<!--\s*WIP\b/i,
	/<!--#exec\b/, // server-side include leak
	/<!--#include\b/,
];

test.describe('Public HTML: no debug comments', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} has no debug-marker HTML comments`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const html = await page.content();
			for (const pattern of DEBUG_COMMENT_PATTERNS) {
				expect(html, `debug-marker ${pattern} on ${path}`).not.toMatch(pattern);
			}
		});
	}
});
