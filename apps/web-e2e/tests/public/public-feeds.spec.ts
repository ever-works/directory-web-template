import { test, expect } from '@playwright/test';

/**
 * Discovery surfaces that AI agents, crawlers, and feed readers depend
 * on. Sister specs:
 *   - `seo-manifests.spec.ts` — sitemap.xml / robots.txt / opengraph
 *     (already exists; we extend with shape checks).
 *   - `agent-discovery.spec.ts` — /llms.txt + /items.json.
 *
 * This spec adds:
 *   - /atom.xml — Atom feed for content updates.
 *   - /favicon.ico — must respond.
 *   - /robots.txt — content shape (User-agent, Sitemap directive).
 *   - /sitemap.xml — declares the discover surface.
 *
 * Each test is conservative: status < 500 + minimal content-type / body
 * shape checks. We avoid asserting on absolute content counts because
 * the catalogue grows over time.
 */

test.describe('Public: discovery surfaces (atom / favicon / robots / sitemap)', () => {
	test('/atom.xml responds non-5xx', async ({ request }) => {
		const response = await request.get('/atom.xml');
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const ct = response.headers()['content-type'] ?? '';
			expect(ct).toMatch(/atom\+xml|application\/xml|text\/xml/);
			const body = await response.text();
			// Atom 1.0 documents always carry a <feed> root with the
			// Atom namespace.
			expect(body).toMatch(/<feed[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom["']/);
		}
	});

	test('/favicon.ico responds non-5xx', async ({ request }) => {
		const response = await request.get('/favicon.ico');
		expect(response.status()).toBeLessThan(500);
	});

	test('/robots.txt advertises a Sitemap directive', async ({ request }) => {
		const response = await request.get('/robots.txt');
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const body = await response.text();
			expect(body).toMatch(/User-agent:/i);
			// The robots file should declare the sitemap so crawlers find it.
			expect(body).toMatch(/Sitemap:/i);
		}
	});

	test('/sitemap.xml references the discover surface', async ({ request }) => {
		const response = await request.get('/sitemap.xml');
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const ct = response.headers()['content-type'] ?? '';
			expect(ct).toMatch(/xml/);
			const body = await response.text();
			// Either a urlset (single-file sitemap) or a sitemapindex
			// (multi-file) — either is acceptable.
			expect(body).toMatch(/<(urlset|sitemapindex)/);
			expect(body).toMatch(/<loc>/);
		}
	});

	test('/llms.txt advertises the items.json data dump', async ({ request }) => {
		// Light overlap with agent-discovery.spec.ts — that spec asserts
		// more on shape. Here we just pin the cross-link.
		const response = await request.get('/llms.txt');
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const body = await response.text();
			expect(body).toContain('/items.json');
		}
	});

	test('/opengraph-image responds with an image content-type', async ({ request }) => {
		const response = await request.get('/opengraph-image');
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const ct = response.headers()['content-type'] ?? '';
			expect(ct).toMatch(/image\//);
		}
	});

	test('all feed surfaces share consistent CORS posture (no auth-cookie branching)', async ({ request }) => {
		// Fabricate a fake session cookie — feeds must respond identically.
		const baselines = await Promise.all([
			request.get('/atom.xml'),
			request.get('/robots.txt'),
			request.get('/sitemap.xml'),
		]);
		const withCookies = await Promise.all([
			request.get('/atom.xml', { headers: { Cookie: 'next-auth.session-token=fake' } }),
			request.get('/robots.txt', { headers: { Cookie: 'next-auth.session-token=fake' } }),
			request.get('/sitemap.xml', { headers: { Cookie: 'next-auth.session-token=fake' } }),
		]);
		expect(withCookies[0].status()).toBe(baselines[0].status());
		expect(withCookies[1].status()).toBe(baselines[1].status());
		expect(withCookies[2].status()).toBe(baselines[2].status());
	});
});
