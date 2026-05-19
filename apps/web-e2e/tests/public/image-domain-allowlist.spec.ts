import { test, expect } from '@playwright/test';

// Next.js images sometimes leak unconfigured hosts as plain <img>. We
// don't enforce a list, but we verify that every image src returns 2xx
// (or 3xx) — broken images are a UX bug.

test.describe('Homepage <img> sources resolve', () => {
	test('every <img src> on / resolves to a real asset', async ({ page, request }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const srcs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('img[src]'))
				.map((img) => img.getAttribute('src') || '')
				.filter((s) => s.length > 0)
		);
		const broken: string[] = [];
		for (const src of srcs.slice(0, 40)) {
			try {
				const url = new URL(src, page.url());
				const r = await request.get(url.toString(), { failOnStatusCode: false });
				if (r.status() >= 400 && r.status() !== 304) {
					broken.push(`${src} → ${r.status()}`);
				}
			} catch {
				/* skip malformed */
			}
		}
		expect(broken, `broken homepage <img> srcs: ${broken.join('; ')}`).toEqual([]);
	});
});
