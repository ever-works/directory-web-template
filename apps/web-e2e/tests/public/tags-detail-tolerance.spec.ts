import { test, expect } from '@playwright/test';

// Tag detail routes:
//   /tags/[tag]
//   /tags/tag/[...tags]      (catch-all)
//   /discover/[page] with optional tag filter (catch-all under /(listing))

const TAG_PROBES = [
	'/tags/sample',
	'/tags/does-not-exist-zz',
	'/tags/tag/a',
	'/tags/tag/a/b',
	'/tags/tag/a/b/c/d/e/f',
	'/tags/' + encodeURIComponent('<weird>')
];

test.describe('Tag detail routes tolerance', () => {
	for (const path of TAG_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
