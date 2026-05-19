import { test, expect } from '@playwright/test';

// More detail-page-flavored perf checks. /items/[slug] is the hottest
// authenticated-organic route — its first-load JS budget directly maps
// to LCP performance.

const HOT_ROUTES = ['/discover/1', '/categories', '/auth/signin'];

test.describe('Hot route perf characteristics', () => {
	for (const path of HOT_ROUTES) {
		test(`${path} ships fewer than 80 HTTP requests on first load`, async ({ page }) => {
			let requestCount = 0;
			page.on('request', () => requestCount++);
			await page.goto(path, { waitUntil: 'load' });
			console.log(`${path}: ${requestCount} requests`);
			expect(requestCount, `${path}: request count`).toBeLessThan(80);
		});

		test(`${path} document HTML response is under 500KB`, async ({ request }) => {
			const resp = await request.get(path);
			const body = await resp.text();
			const kb = Math.round(body.length / 1024);
			console.log(`${path}: HTML doc ${kb} KB`);
			expect(kb, `${path}: doc size ${kb}KB`).toBeLessThan(500);
		});
	}

	test('home document Time-To-First-Byte under 5s', async ({ request }) => {
		const start = Date.now();
		const resp = await request.get('/');
		const elapsed = Date.now() - start;
		expect(resp.status()).toBeLessThan(400);
		expect(elapsed, `home TTFB ${elapsed}ms`).toBeLessThan(5_000);
	});
});
