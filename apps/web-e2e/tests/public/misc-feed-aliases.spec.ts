import { test, expect } from '@playwright/test';

// Common feed-discovery aliases under root. Must non-5xx.

const FEEDS = [
	'/rss',
	'/rss.xml',
	'/atom',
	'/atom.xml',
	'/feed',
	'/feed.xml',
	'/feed.json',
	'/rss/full',
	'/feeds/all',
	'/index.xml',
	'/.rss',
	'/.atom'
];

test.describe('Feed alias tolerance', () => {
	for (const path of FEEDS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
