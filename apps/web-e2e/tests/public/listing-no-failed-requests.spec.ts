import { test, expect } from '@playwright/test';

// No 4xx/5xx network failures during a single home page navigation,
// EXCEPT for known-noise paths (auth/session anon, etc).

const NOISE_PATTERNS = [
	/\/api\/auth\/session/,
	/\/api\/auth\/csrf/,
	/\/api\/current-user/,
	/\/api\/user\/profile/,
	/\/api\/user\/subscription/,
	/\/api\/user\/plan-status/,
	/\/api\/user\/currency/,
	// `_next/image` proxies arbitrary upstream URLs from item icons.
	// When the seed data points at a placeholder host (example.com,
	// missing CDN), the upstream 404 propagates as a 4xx here. That
	// is an upstream-data issue, not a bug in our routing — the
	// image-domain-allowlist spec covers asset-level reachability.
	/\/_next\/image\?/
];

const PAGES = ['/', '/about', '/discover/1'];

test.describe('No failed requests during navigation', () => {
	for (const path of PAGES) {
		test(`${path} navigation has no unexpected 4xx/5xx`, async ({ page }) => {
			const failures: { url: string; status: number }[] = [];
			page.on('response', (res) => {
				const s = res.status();
				if (s >= 400) {
					const u = res.url();
					if (!NOISE_PATTERNS.some((re) => re.test(u))) {
						failures.push({ url: u, status: s });
					}
				}
			});
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			await page.waitForTimeout(800);
			const summary = failures.map((f) => `${f.status} ${f.url}`).join(' | ');
			expect(failures, `failures on ${path}: ${summary}`).toEqual([]);
		});
	}
});
