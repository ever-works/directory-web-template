import { test, expect } from '@playwright/test';

// /items/[slug] detail page tolerance: unknown slug, weird slug, very
// long slug, slug containing dots.

const PROBES = [
	'/items/sample',
	'/items/does-not-exist-zzz',
	'/items/' + encodeURIComponent('<weird>'),
	'/items/' + 'a'.repeat(512),
	'/items/with.dots.in.slug',
	'/items/with-dashes-and-underscores_x',
	'/items/' + encodeURIComponent(' '),
	'/items/' + encodeURIComponent('日本語')
];

test.describe('Item detail deeper slug tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
