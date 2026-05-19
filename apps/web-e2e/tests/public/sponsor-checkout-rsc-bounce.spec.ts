import { test, expect } from '@playwright/test';

// /sponsor + RSC suffix should always non-5xx anonymously.

const PROBES = [
	'/sponsor?_rsc=abc',
	'/sponsor?step=1&_rsc=abc',
	'/sponsor?provider=stripe&_rsc=abc',
	'/sponsor?provider=polar&_rsc=abc'
];

test.describe('Sponsor RSC suffix tolerance', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
