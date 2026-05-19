import { test, expect } from '@playwright/test';

// Sponsor-ads checkout edge inputs.

const PAYLOADS = [
	{},
	{ plan: 'unknown' },
	{ plan: 'basic', placement: 'NOT-REAL' },
	{ plan: '' },
	{ plan: null },
	{ plan: 'a'.repeat(2000) }
];

test.describe('Sponsor-ads checkout malformed payloads', () => {
	for (const data of PAYLOADS) {
		test(`POST /api/sponsor-ads/checkout payload=${JSON.stringify(data).slice(0, 64)} non-5xx`, async ({
			request
		}) => {
			const resp = await request.post('/api/sponsor-ads/checkout', { data });
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
