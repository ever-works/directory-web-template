import { test, expect } from '@playwright/test';

// Listing pages with the RSC streaming suffix `?_rsc=` and prefetch
// header `RSC: 1`. Must non-5xx in both shapes.

const RSC_PROBES = [
	'/discover/1',
	'/discover/2',
	'/categories',
	'/tags',
	'/collections',
	'/items/sample',
	'/about',
	'/pricing'
];

test.describe('Listing RSC stream tolerance', () => {
	for (const path of RSC_PROBES) {
		test(`GET ${path} with RSC header non-5xx`, async ({ request }) => {
			const resp = await request.get(path, {
				headers: { RSC: '1' }
			});
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});

		test(`GET ${path}?_rsc=abc non-5xx`, async ({ request }) => {
			const resp = await request.get(path + '?_rsc=abc');
			expect(resp.status(), `${path}?_rsc=abc`).toBeLessThan(500);
		});
	}
});
