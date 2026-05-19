import { test, expect } from '@playwright/test';

// Sitemap variants — image / news / video. None required; if served, non-5xx.

const PROBES = [
	'/sitemap-image.xml',
	'/sitemap-news.xml',
	'/sitemap-video.xml',
	'/image-sitemap.xml',
	'/news-sitemap.xml',
	'/video-sitemap.xml'
];

test.describe('Sitemap variants tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
