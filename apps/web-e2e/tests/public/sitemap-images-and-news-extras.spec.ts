import { test, expect } from '@playwright/test';

// Extra sitemap aliases and SEO discovery URLs.

const PROBES = [
	'/sitemap_index.xml',
	'/sitemap.xml.gz',
	'/sitemap-0.xml',
	'/sitemap-1.xml',
	'/sitemap-en.xml',
	'/sitemap-fr.xml',
	'/sitemap-es.xml'
];

test.describe('Sitemap alias paths non-5xx', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
