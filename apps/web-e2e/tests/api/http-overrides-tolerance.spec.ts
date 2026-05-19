import { test, expect } from '@playwright/test';

// Common method-override headers (`X-HTTP-Method-Override`, `_method=`)
// must NOT bypass auth. We probe a few read endpoints.

const PROBES = [
	'/api/admin/items',
	'/api/admin/users',
	'/api/client/items',
	'/api/user/profile'
];

test.describe('HTTP method override headers do not bypass auth', () => {
	for (const path of PROBES) {
		test(`POST ${path} with X-HTTP-Method-Override=DELETE rejects anonymous`, async ({
			request
		}) => {
			const resp = await request.post(path, {
				headers: { 'x-http-method-override': 'DELETE' },
				data: {}
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});

		test(`POST ${path}?_method=DELETE rejects anonymous`, async ({ request }) => {
			const resp = await request.post(path + '?_method=DELETE', { data: {} });
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
