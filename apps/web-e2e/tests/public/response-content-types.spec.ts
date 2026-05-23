import { test, expect } from '@playwright/test';

// Content-Type contracts: each public endpoint must declare what it
// returns. A page returning application/json or an API returning text/html
// would break consumers silently.

const HTML_PAGES = ['/', '/about', '/help', '/categories', '/auth/signin'];
const JSON_ENDPOINTS = [
	'/api/version',
	'/api/auth/providers',
	'/api/auth/csrf',
	'/api/auth/session',
	'/api/current-user',
	// Lives at `/items.json` (root-level metadata-image-style route), not
	// under `/api/`. See `apps/web/app/items.json/route.ts`.
	'/items.json',
	'/api/user/currency'
];

test.describe('Content-Type contracts', () => {
	for (const path of HTML_PAGES) {
		test(`HTML page ${path} returns text/html`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(400);
			const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
			expect(ct, `${path} content-type`).toContain('text/html');
			expect(ct).toContain('charset');
		});
	}

	for (const path of JSON_ENDPOINTS) {
		test(`JSON endpoint ${path} returns application/json`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(400);
			const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
			expect(ct, `${path} content-type`).toContain('application/json');
		});
	}

	test('sitemap.xml returns application/xml or text/xml', async ({ request }) => {
		const resp = await request.get('/sitemap.xml');
		expect(resp.status()).toBeLessThan(400);
		const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
		expect(ct).toMatch(/xml/);
	});

	test('rss.xml returns RSS-shaped content-type', async ({ request }) => {
		const resp = await request.get('/rss.xml');
		expect(resp.status()).toBeLessThan(400);
		const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
		expect(ct).toMatch(/xml|rss/);
	});

	test('robots.txt returns text/plain', async ({ request }) => {
		const resp = await request.get('/robots.txt');
		expect(resp.status()).toBeLessThan(400);
		const ct = (resp.headers()['content-type'] ?? '').toLowerCase();
		expect(ct).toContain('text/plain');
	});
});
