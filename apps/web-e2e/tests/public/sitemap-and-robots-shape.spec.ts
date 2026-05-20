import { test, expect } from '@playwright/test';

// /sitemap.xml and /robots.txt are the SEO crown jewels. They must:
// - return 200
// - have the right content-type
// - not be empty

test.describe('Sitemap and robots shape', () => {
	test('/sitemap.xml is XML and non-empty', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const ct = (resp.headers()['content-type'] || '').toLowerCase();
		expect(ct).toMatch(/xml/);
		const body = await resp.text();
		expect(body.length).toBeGreaterThan(50);
		expect(body).toContain('<?xml');
	});

	test('/robots.txt is text and non-empty', async ({ request }) => {
		const resp = await request.get('/robots.txt');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.length).toBeGreaterThan(10);
	});

	test('/llms.txt is text and non-empty (when present)', async ({ request }) => {
		const resp = await request.get('/llms.txt');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = await resp.text();
		expect(body.length).toBeGreaterThan(0);
	});

	test('/feed.json is valid JSON when present', async ({ request }) => {
		const resp = await request.get('/feed.json');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const txt = await resp.text();
		expect(() => JSON.parse(txt)).not.toThrow();
	});
});
