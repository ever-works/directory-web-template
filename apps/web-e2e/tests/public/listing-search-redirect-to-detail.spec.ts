import { test, expect } from '@playwright/test';

// /search and /s aliases — should either route to discover or 404, never 5xx.

const SEARCH_ALIASES = [
	'/search',
	'/search?q=hello',
	'/s',
	'/s?q=hello',
	'/q/hello',
	'/q?q=hello',
	'/find',
	'/find?q=hello'
];

test.describe('Search alias routes tolerance', () => {
	for (const path of SEARCH_ALIASES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
