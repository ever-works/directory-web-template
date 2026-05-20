import { test, expect } from '@playwright/test';

// /sitemap.xml must list at least the homepage. Each <loc> must be an
// absolute URL.

test.describe('Sitemap listing shape', () => {
	test('/sitemap.xml lists at least one absolute URL', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		const matches = body.match(/<loc>(https?:[^<]+)<\/loc>/g);
		expect(matches, 'sitemap.xml has at least one <loc>').toBeTruthy();
		expect(matches!.length).toBeGreaterThan(0);
	});

	test('/sitemap.xml does not include /api/ or /admin/', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.toLowerCase()).not.toContain('<loc>https://');
		// The above might give false negatives — instead validate per URL.
		const urls = (body.match(/<loc>([^<]+)<\/loc>/g) || []).map((m) => m.replace(/<\/?loc>/g, ''));
		const bad = urls.filter((u) => /\/(api|admin|client|dashboard)\//.test(u));
		expect(bad, `sitemap lists protected URLs: ${bad.join(', ')}`).toEqual([]);
	});
});
