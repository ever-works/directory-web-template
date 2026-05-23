import { test, expect } from '@playwright/test';

// /discover/[page] boundary numerics: huge, negative, decimal, scientific.

const BOUNDARY_PROBES = [
	'/discover/1e6',
	'/discover/3.14',
	'/discover/1.0',
	'/discover/+1',
	'/discover/01',
	'/discover/0x1',
	'/discover/00000001',
	'/discover/999999999999999999999',
	'/discover/' + Number.MAX_SAFE_INTEGER.toString()
];

test.describe('Listing page-number boundary tolerance', () => {
	for (const path of BOUNDARY_PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
