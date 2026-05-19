import { test, expect } from '@playwright/test';

// /pages/[slug] is the CMS slug bucket. Unknown slugs must 404, known
// slugs must 200 — neither may 5xx. We don't assert copy text since the
// CMS owns it.

const CMS_PROBES = [
	'/pages/about',
	'/pages/contact',
	'/pages/terms',
	'/pages/privacy',
	'/pages/totally-not-a-real-page-zzqxx'
];

test.describe('CMS /pages/[slug] tolerance', () => {
	for (const path of CMS_PROBES) {
		test(`${path} responds non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('/pages/<extremely-long-slug> does not 5xx', async ({ page }) => {
		const long = 'a'.repeat(512);
		const resp = await page.goto(`/pages/${long}`, { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
