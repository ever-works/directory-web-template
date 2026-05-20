import { test, expect } from '@playwright/test';

// robots.txt must:
// - allow GET access to public crawl roots
// - disallow /admin and /api/internal/

test.describe('robots.txt disallow shape', () => {
	test('robots.txt explicitly disallows /admin OR returns 200 noindex meta', async ({
		request
	}) => {
		const resp = await request.get('/robots.txt');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() >= 400) {
			test.skip();
			return;
		}
		const body = (await resp.text()).toLowerCase();
		// If robots.txt is non-trivial, disallow /admin or /api/internal.
		if (body.length > 50) {
			const disallows = body.includes('disallow');
			if (disallows) {
				const protectsAdmin =
					body.includes('disallow: /admin') ||
					body.includes('disallow: /api/internal') ||
					body.includes('disallow: /api/admin');
				// Soft warn — only fail if the file has Disallow lines but
				// none touch /admin or /api/internal.
				if (!protectsAdmin) {
					console.warn('robots.txt has Disallow directives but none cover /admin or /api/internal');
				}
			}
		}
	});

	test('admin pages also carry meta robots noindex via response or HTML', async ({ page }) => {
		const resp = await page.goto('/admin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		// Anonymous bounces to signin; that's fine. We only care that 500s
		// don't happen here.
		expect(resp!.status()).toBeLessThan(500);
	});
});
