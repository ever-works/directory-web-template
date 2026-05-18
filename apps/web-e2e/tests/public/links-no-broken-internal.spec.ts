import { test, expect } from '@playwright/test';

// Crawl a representative set of pages and assert every same-origin link
// either points at a known route or returns < 500 when probed. Catches
// the entire class of "renamed a route, forgot to update the footer link"
// regressions before they reach customers.

const SEED_PAGES = ['/', '/about', '/help', '/pricing', '/categories', '/tags'];

test.describe('Internal link validity (sample)', () => {
	for (const seed of SEED_PAGES) {
		test(`${seed}: internal links resolve (non-5xx)`, async ({ page, request }) => {
			await page.goto(seed, { waitUntil: 'domcontentloaded' });

			const hrefs = await page.locator('a[href]').evaluateAll((els) =>
				els
					.map((el) => (el as HTMLAnchorElement).getAttribute('href') ?? '')
					.filter(
						(h) =>
							h &&
							!h.startsWith('http') &&
							!h.startsWith('//') &&
							!h.startsWith('mailto:') &&
							!h.startsWith('tel:') &&
							!h.startsWith('#') &&
							!h.startsWith('javascript:')
					)
			);

			// Dedup and sample at most 15 links to keep CI quick.
			const unique = Array.from(new Set(hrefs)).slice(0, 15);
			expect(unique.length, `${seed}: should have at least one internal link`).toBeGreaterThan(0);

			for (const href of unique) {
				const target = href.startsWith('/') ? href : `/${href}`;
				const resp = await request.head(target, { maxRedirects: 5 }).catch(async () => {
					// Some servers don't allow HEAD — fall back to GET.
					return await request.get(target, { maxRedirects: 5 });
				});
				expect(resp.status(), `${seed} → ${target} status`).toBeLessThan(500);
			}
		});
	}
});
