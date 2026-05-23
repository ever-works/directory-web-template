import { test, expect } from '@playwright/test';

// /admin/* with ?_rsc=… or RSC: 1 header — anonymous bounce path must
// still non-5xx (the RSC payload route is what crashes most commonly).

const PROBES = [
	'/admin',
	'/admin/items',
	'/admin/categories',
	'/admin/users',
	'/admin/settings',
	'/admin/reports',
	'/admin/surveys'
];

test.describe('Admin RSC suffix tolerance for anonymous', () => {
	for (const path of PROBES) {
		test(`${path}?_rsc=abc non-5xx`, async ({ request }) => {
			const resp = await request.get(path + '?_rsc=abc');
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`${path} with RSC:1 header non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { headers: { RSC: '1' } });
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
