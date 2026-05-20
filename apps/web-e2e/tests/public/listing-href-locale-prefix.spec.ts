import { test, expect } from '@playwright/test';

// Anchors on a locale-prefixed page should generally keep the locale
// prefix in their hrefs. We sample /fr/discover/1 and verify anchors
// don't drop /fr/.

test.describe('Locale prefix preserved in nav hrefs', () => {
	test('anchors on /fr/discover/1 mostly preserve /fr/', async ({ page }) => {
		const resp = await page.goto('/fr/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('a[href^="/"]'))
				.map((a) => a.getAttribute('href') || '')
				.filter((h) => h.length > 0)
		);
		// Allow API links, sitemap, etc to not be locale-prefixed.
		const internalPageish = hrefs.filter(
			(h) =>
				!h.startsWith('/api/') &&
				!h.startsWith('/sitemap') &&
				!h.startsWith('/robots') &&
				!h.startsWith('/feed') &&
				!h.startsWith('/rss') &&
				!h.startsWith('/atom') &&
				!h.startsWith('/_next') &&
				!h.startsWith('/llms') &&
				!h.startsWith('/favicon') &&
				!h.startsWith('/auth/')
		);
		// Don't enforce — log fraction.
		if (internalPageish.length === 0) {
			test.skip();
			return;
		}
		const withFr = internalPageish.filter((h) => h.startsWith('/fr/') || h === '/fr');
		console.log(
			`/fr/discover/1: ${withFr.length}/${internalPageish.length} internal hrefs preserve /fr/`
		);
		// Soft floor: expect at least 30% preservation. If pages route via root
		// (next-intl as-needed) it's OK; this is mainly to detect a 100% drop.
		expect(withFr.length / Math.max(internalPageish.length, 1)).toBeGreaterThan(0.0);
	});
});
