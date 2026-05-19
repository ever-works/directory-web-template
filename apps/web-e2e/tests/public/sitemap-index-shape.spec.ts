import { test, expect } from '@playwright/test';

// Sitemap may be a sitemap index (lists multiple sitemap.xml files).
// Validate that any nested sitemap URLs are absolute + non-5xx.

test.describe('Sitemap index nested URLs (if present)', () => {
	test('/sitemap.xml nested sitemap URLs resolve', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		if (resp.status() >= 400) test.skip();
		const body = await resp.text();
		const isIndex = body.includes('<sitemapindex');
		if (!isIndex) test.skip();
		const urls = (body.match(/<loc>([^<]+)<\/loc>/g) || [])
			.map((m) => m.replace(/<\/?loc>/g, ''))
			.slice(0, 5);
		for (const u of urls) {
			expect(u.startsWith('http'), `nested sitemap should be absolute: ${u}`).toBe(true);
			const r = await request.get(u, { failOnStatusCode: false });
			expect(r.status(), `nested sitemap ${u}`).toBeLessThan(500);
		}
	});
});
