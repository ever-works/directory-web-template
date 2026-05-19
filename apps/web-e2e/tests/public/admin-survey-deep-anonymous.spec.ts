import { test, expect } from '@playwright/test';

// Deep admin survey routes — anonymous gate + RSC + locale variants.

const PROBES = [
	'/admin/surveys/probe-id/edit',
	'/admin/surveys/probe-id/preview',
	'/admin/surveys/probe-id/responses',
	'/admin/surveys/create?_rsc=abc',
	'/admin/surveys/probe-id/edit?_rsc=abc',
	'/en/admin/surveys/probe-id/edit',
	'/fr/admin/surveys/probe-id/preview',
	'/es/admin/surveys/probe-id/responses'
];

test.describe('Admin survey deep paths anonymous gate', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
