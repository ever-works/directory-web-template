import { test, expect } from '@playwright/test';

// Multiple locale prefixes stacked should not 5xx. /en/fr/about etc.
// Most setups respond 404 — but must never 500.

const PROBES = [
	'/en/fr/about',
	'/fr/en/discover/1',
	'/es/de/categories',
	'/en/en/about',
	'/fr/fr/discover/1',
	'/en/en/en/about'
];

test.describe('Stacked locale prefix tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
