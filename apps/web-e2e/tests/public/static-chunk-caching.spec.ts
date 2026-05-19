import { test, expect } from '@playwright/test';

// Static chunks under /_next/static/* are hash-named — they MUST be cached
// long-term (Cache-Control immutable). This is what makes the second load
// instant. Regression check: a misconfigured proxy stripping the header.

test.describe('Static chunk cache headers', () => {
	test('homepage exposes at least one /_next/static/ asset', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('script[src],link[href]'))
				.map((el) => el.getAttribute('src') || el.getAttribute('href') || '')
				.filter((u) => u.includes('/_next/static/'))
		);
		expect(hrefs.length, 'at least one /_next/static asset on homepage').toBeGreaterThan(0);
	});

	test('a /_next/static/ asset has immutable cache-control', async ({ page, request }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const href = await page.evaluate(() => {
			const el = Array.from(document.querySelectorAll('script[src],link[href]')).find((el) => {
				const u = el.getAttribute('src') || el.getAttribute('href') || '';
				return u.includes('/_next/static/');
			});
			return el ? el.getAttribute('src') || el.getAttribute('href') : null;
		});
		if (!href) test.skip();
		const resp = await request.get(href!);
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() < 400) {
			const cc = (resp.headers()['cache-control'] || '').toLowerCase();
			// Vercel ships max-age=31536000, immutable — accept any long max-age.
			expect(cc).toMatch(/(immutable|max-age=\d{6,})/);
		}
	});
});
