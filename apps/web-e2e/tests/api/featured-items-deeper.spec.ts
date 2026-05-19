import { test, expect } from '@playwright/test';

// Public /api/featured-items shape + query variants. Must non-5xx and
// return JSON when 200.

const PROBES = [
	'/api/featured-items',
	'/api/featured-items?limit=10',
	'/api/featured-items?limit=0',
	'/api/featured-items?limit=-1',
	'/api/featured-items?limit=999999',
	'/api/featured-items?limit=abc',
	'/api/featured-items?offset=0',
	'/api/featured-items?category=sample',
	'/api/featured-items?tag=sample',
	'/api/featured-items?include=' + encodeURIComponent('all,nested')
];

test.describe('Featured items query tolerance', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			if (resp.status() === 200) {
				const txt = await resp.text();
				expect(() => JSON.parse(txt)).not.toThrow();
			}
		});
	}
});
