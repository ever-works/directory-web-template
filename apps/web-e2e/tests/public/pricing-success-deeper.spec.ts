import { test, expect } from '@playwright/test';

// /pricing/success is the post-checkout landing. Various provider params,
// missing params, bogus session ids — all must not 5xx and not leak PII.

const PRICING_SUCCESS_PROBES = [
	'/pricing/success',
	'/pricing/success?session_id=fake',
	'/pricing/success?session_id=' + 'a'.repeat(512),
	'/pricing/success?provider=stripe',
	'/pricing/success?provider=polar',
	'/pricing/success?provider=lemonsqueezy',
	'/pricing/success?provider=solidgate',
	'/pricing/success?provider=NOT-REAL',
	'/pricing/success?canceled=true',
	'/pricing/success?error=' + encodeURIComponent('something went wrong')
];

test.describe('Pricing success route tolerance', () => {
	for (const path of PRICING_SUCCESS_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
