import { test, expect } from '@playwright/test';

// Dynamic OG image routes. App Router conventions include `/opengraph-image`
// and `/twitter-image` (auto-generated). Both must non-5xx.

const OG_PROBES = [
	'/opengraph-image',
	'/twitter-image',
	'/icon',
	'/apple-icon',
	'/items/sample/opengraph-image',
	'/items/sample/twitter-image',
	'/items/does-not-exist/opengraph-image'
];

test.describe('OG image routes', () => {
	for (const path of OG_PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
