import { test, expect } from '@playwright/test';

// Stripe redirect targets that aren't real Stripe URLs (we use our own
// /pricing/success). Various query shapes must non-5xx.

const STRIPE_PROBES = [
	'/pricing/success?session_id=cs_test_a1b2c3',
	'/pricing/success?provider=stripe&session_id=cs_test_a1b2c3',
	'/pricing/success?canceled=true',
	'/pricing/success?status=success',
	'/pricing/success?status=cancel',
	'/pricing/success?error=' + encodeURIComponent('Card declined')
];

test.describe('Stripe redirect landing tolerance', () => {
	for (const path of STRIPE_PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	}
});
