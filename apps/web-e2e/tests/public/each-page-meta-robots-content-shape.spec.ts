import { test, expect } from '@playwright/test';

/**
 * meta[name="robots"] content must be a comma-separated list of known
 * directives. Unknown values are silently ignored by crawlers, so a
 * typo means the SEO intent is broken without any error signal.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const KNOWN_ROBOTS_DIRECTIVES = new Set([
	'index',
	'noindex',
	'follow',
	'nofollow',
	'all',
	'none',
	'noarchive',
	'nosnippet',
	'notranslate',
	'noimageindex',
	'nositelinkssearchbox',
	'max-snippet',
	'max-image-preview',
	'max-video-preview',
	'unavailable_after',
]);

test.describe('Public HTML: meta[name="robots"] content shape', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} meta robots content is well-formed if present`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const robots = await page
				.locator('meta[name="robots"]')
				.first()
				.getAttribute('content');
			if (robots === null) return;
			const directives = robots
				.toLowerCase()
				.split(',')
				.map((d) => d.trim().split(':')[0].trim())
				.filter((d) => d.length > 0);
			expect(directives.length, `robots directives on ${path}`).toBeGreaterThan(0);
			for (const directive of directives) {
				expect(
					KNOWN_ROBOTS_DIRECTIVES.has(directive),
					`unknown robots directive "${directive}" in "${robots}" on ${path}`,
				).toBe(true);
			}
		});
	}
});
