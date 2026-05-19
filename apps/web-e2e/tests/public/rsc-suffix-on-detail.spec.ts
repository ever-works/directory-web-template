import { test, expect } from '@playwright/test';

// Validates that detail routes WITH BOTH _rsc and locale prefix still
// non-5xx.

const COMBOS = [
	'/en/items/sample?_rsc=abc',
	'/fr/items/sample?_rsc=abc',
	'/en/categories/sample?_rsc=abc',
	'/en/tags/sample?_rsc=abc',
	'/en/collections/sample?_rsc=abc',
	'/en/auth/signin?_rsc=abc',
	'/en/discover/1?_rsc=abc',
	'/fr/discover/1?_rsc=abc'
];

test.describe('Locale + RSC suffix on detail routes', () => {
	for (const path of COMBOS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
