import { test, expect } from '@playwright/test';

// RSS / Atom / JSON feeds should always contain at least the channel
// metadata even when empty. Catches the class of "feed generator throws
// on empty seed" regressions.

test.describe('Feed shape: empty-data tolerance', () => {
	test('rss.xml has channel title even with no items', async ({ request }) => {
		const resp = await request.get('/rss.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body).toContain('<channel>');
		expect(body).toContain('<title>');
		expect(body).toContain('<link>');
	});

	test('atom.xml has feed id + title', async ({ request }) => {
		const resp = await request.get('/atom.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		expect(body).toContain('<title>');
		expect(body).toMatch(/<id>|<link\s/i);
	});

	test('feed.json has title + home_page_url', async ({ request }) => {
		const resp = await request.get('/feed.json');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.json();
		expect(body.version).toBeTruthy();
		expect(body.title).toBeTruthy();
		// home_page_url is required by JSON Feed 1.1.
		expect(body.home_page_url || body.homePageUrl).toBeTruthy();
	});

	test('sitemap.xml lists at least one URL', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		expect(resp.status()).toBeLessThan(400);
		const body = await resp.text();
		const urls = body.match(/<url>/g);
		expect(urls, 'sitemap should have at least one <url> entry').toBeTruthy();
		expect(urls!.length).toBeGreaterThanOrEqual(1);
	});
});
