import { test, expect } from '@playwright/test';

// /map is the geo view. May 404 if maps feature flag off — must never 5xx.
// We do NOT assert any leaflet/mapbox content (vendor-specific, brittle).

const MAP_PROBES = [
	'/map',
	'/map?zoom=2',
	'/map?zoom=18',
	'/map?zoom=NaN',
	'/map?bbox=1,2,3,4',
	'/map?lat=0&lng=0',
	'/map?category=sample'
];

test.describe('Map route tolerance', () => {
	for (const path of MAP_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
