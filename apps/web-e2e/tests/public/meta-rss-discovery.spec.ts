import { test, expect } from '@playwright/test';

// Feeds (RSS / Atom / JSON Feed) should be discoverable from every page
// via <link rel="alternate" type="application/rss+xml" ...>. Without
// this, feed readers can't find the directory's content.

test.describe('Feed autodiscovery <link>s', () => {
	for (const path of ['/', '/about', '/categories']) {
		test(`${path} advertises RSS / Atom / JSON Feed`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });

			const rss = await page
				.locator('link[type="application/rss+xml"]')
				.first()
				.getAttribute('href')
				.catch(() => null);
			const atom = await page
				.locator('link[type="application/atom+xml"]')
				.first()
				.getAttribute('href')
				.catch(() => null);
			const json = await page
				.locator('link[type="application/feed+json"]')
				.first()
				.getAttribute('href')
				.catch(() => null);

			// Spec 010+ added all three. We require at least one (RSS is the
			// minimum useful baseline).
			expect(rss || atom || json, `${path}: at least one feed link`).toBeTruthy();

			if (rss) expect(rss).toContain('rss.xml');
			if (atom) expect(atom).toContain('atom.xml');
			if (json) expect(json).toContain('feed.json');
		});
	}
});
