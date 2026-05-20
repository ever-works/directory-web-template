import { test, expect } from '@playwright/test';

/**
 * Rendered HTML must not leak server-side filesystem paths. These usually
 * appear in stack traces or unfiltered error pages — a sign that an
 * exception was rendered into user-facing HTML instead of being handled.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing'];

const PATH_LEAK_PATTERNS = [
	/\/var\/www\//,
	/\/var\/log\//,
	/\/usr\/local\//,
	/\/home\/[a-z_][a-z0-9_-]+\//,
	/\/root\//,
	/\/tmp\/[a-z]/i,
	/[A-Z]:\\Users\\[A-Za-z0-9_.-]+\\/,
	/[A-Z]:\\Coding\\/,
	/\\node_modules\\/,
	/\/node_modules\/\.pnpm\//,
];

test.describe('Public HTML: no server-side filesystem path leaks', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} contains no filesystem paths`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const html = await page.content();
			for (const pattern of PATH_LEAK_PATTERNS) {
				expect(html, `path leak ${pattern} on ${path}`).not.toMatch(pattern);
			}
		});
	}
});
