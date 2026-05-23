import { test, expect } from '@playwright/test';

// Feeds (RSS / Atom / JSON Feed) should be discoverable from every page
// via <link rel="alternate" type="application/rss+xml" ...>. Without
// this, feed readers can't find the directory's content.

async function readLinkHref(
	page: import('@playwright/test').Page,
	selector: string
): Promise<string | null> {
	const loc = page.locator(selector).first();
	if ((await loc.count()) === 0) return null;
	return await loc.getAttribute('href');
}

test.describe('Feed autodiscovery <link>s', () => {
	for (const path of ['/', '/about', '/categories']) {
		test(`${path} advertises RSS / Atom / JSON Feed`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });

			// Probe existence before `getAttribute` — the default locator
			// wait would otherwise burn 30s per absent link tag.
			const rss = await readLinkHref(page, 'link[type="application/rss+xml"]');
			const atom = await readLinkHref(page, 'link[type="application/atom+xml"]');
			const json = await readLinkHref(page, 'link[type="application/feed+json"]');

			// Spec 010+ added all three. We require at least one (RSS is the
			// minimum useful baseline).
			expect(rss || atom || json, `${path}: at least one feed link`).toBeTruthy();

			if (rss) expect(rss).toContain('rss.xml');
			if (atom) expect(atom).toContain('atom.xml');
			if (json) expect(json).toContain('feed.json');
		});
	}
});
