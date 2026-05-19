import { test, expect } from '@playwright/test';

// Non-existent API paths — must 404 (or auth-gated 401/403), never 5xx,
// never 200.

const PROBES = [
	'/api/does-not-exist',
	'/api/foo/bar/baz',
	'/api/' + 'a'.repeat(256),
	'/api/admin/foo-fake',
	'/api/items/sample/foo-fake',
	'/api/items/.././../admin',
	'/api/auth/foo-not-a-handler'
];

test.describe('Non-existent API paths', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx + not 200`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			expect(resp.status(), path).not.toBe(200);
		});
	}
});
