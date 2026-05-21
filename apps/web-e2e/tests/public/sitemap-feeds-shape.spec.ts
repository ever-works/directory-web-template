import { test, expect } from '@playwright/test';

// Beyond just "responds 200", these meta endpoints carry structured data
// search/feed-reader clients depend on. Each test parses the body and
// asserts the minimum required shape.

test.describe('Sitemap + feeds shape', () => {
	test('sitemap.xml is well-formed XML with <urlset>', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body).toMatch(/^<\?xml/);
		expect(body).toContain('<urlset');
		expect(body).toContain('</urlset>');
		// At least one <url> entry (home page should always be there).
		expect(body).toMatch(/<loc>https?:\/\//);
	});

	test('robots.txt allows or denies plausibly', async ({ request }) => {
		const resp = await request.get('/robots.txt');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body.toLowerCase()).toMatch(/user-agent/);
	});

	test('rss.xml is well-formed RSS 2.0', async ({ request }) => {
		const resp = await request.get('/rss.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body).toMatch(/^<\?xml/);
		expect(body).toContain('<rss');
		expect(body).toContain('<channel>');
		expect(body).toContain('</rss>');
	});

	test('atom.xml is well-formed Atom 1.0', async ({ request }) => {
		const resp = await request.get('/atom.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body).toMatch(/^<\?xml/);
		expect(body).toContain('<feed');
		expect(body).toContain('</feed>');
	});

	test('feed.json is well-formed JSON Feed 1.1', async ({ request }) => {
		const resp = await request.get('/feed.json');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body.version, 'JSON feed version field').toBeTruthy();
		expect(body.items, 'JSON feed items array').toBeTruthy();
		expect(Array.isArray(body.items)).toBe(true);
	});

	test('llms-full.txt + llms.txt respond non-5xx', async ({ request }) => {
		for (const path of ['/llms-full.txt', '/llms.txt']) {
			const resp = await request.get(path);
			expect(resp.status(), `${path}`).toBeLessThan(500);
		}
	});

	test('opengraph-image responds with an image (when reachable)', async ({ request }) => {
		// `/opengraph-image` is a metadata-image route registered at the
		// `app/` root, but on locale-prefixed deployments the i18n
		// middleware can route it to `/<locale>/opengraph-image` (which
		// 404s when the locale page doesn't expose its own image). The
		// dedicated `public-feeds` + `opengraph-image-routes` suites cover
		// the non-5xx contract; we only assert the image content-type here
		// when the root route is actually reachable.
		const resp = await request.get('/opengraph-image');
		expect(resp.status(), '/opengraph-image must not 5xx').toBeLessThan(500);
		if (resp.status() >= 400) return;
		const ct = resp.headers()['content-type'] ?? '';
		expect(ct.toLowerCase()).toMatch(/image\/(png|jpeg|jpg|webp)/);
	});
});
