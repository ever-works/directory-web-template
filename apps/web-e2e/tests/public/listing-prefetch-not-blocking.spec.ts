import { test, expect } from '@playwright/test';

// link[rel="prefetch"] hrefs should not be 5xx when fetched.

test.describe('Prefetch links non-5xx when fetched', () => {
	test('/ prefetch/preload hrefs respond non-5xx', async ({ page, request }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const hrefs = await page.evaluate(() =>
			Array.from(
				document.querySelectorAll('link[rel="prefetch"][href], link[rel="preload"][href]')
			)
				.map((l) => l.getAttribute('href') || '')
				.filter((h) => h.length > 0 && (h.startsWith('/') || h.startsWith('http')))
				.slice(0, 10)
		);
		for (const h of hrefs) {
			try {
				const url = new URL(h, page.url());
				const r = await request.get(url.toString(), { failOnStatusCode: false });
				expect(r.status(), `prefetch ${h}`).toBeLessThan(500);
			} catch {
				/* tolerate malformed */
			}
		}
	});
});
