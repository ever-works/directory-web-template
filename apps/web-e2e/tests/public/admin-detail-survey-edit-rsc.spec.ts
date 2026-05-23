import { test, expect } from '@playwright/test';

// Admin survey edit / preview / responses with RSC suffix. Anonymous
// bouncing path must not 5xx.

const PROBES = [
	'/admin/surveys/sample/edit?_rsc=abc',
	'/admin/surveys/sample/preview?_rsc=abc',
	'/admin/surveys/sample/responses?_rsc=abc',
	'/admin/surveys/create?_rsc=abc'
];

test.describe('Admin survey RSC suffix tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
