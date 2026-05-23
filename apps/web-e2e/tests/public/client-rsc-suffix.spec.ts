import { test, expect } from '@playwright/test';

const PROBES = [
	'/client/dashboard',
	'/client/settings',
	'/client/sponsorships',
	'/client/submissions',
	'/client/profile/sample',
	'/dashboard/billing',
	'/favorites'
];

test.describe('Client / dashboard RSC suffix anonymous', () => {
	for (const path of PROBES) {
		test(`${path}?_rsc=abc non-5xx`, async ({ request }) => {
			const resp = await request.get(path + '?_rsc=abc');
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`${path} with RSC:1 non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { headers: { RSC: '1' } });
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
