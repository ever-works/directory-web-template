import { test, expect } from '@playwright/test';

// Defense in depth: even paths that LOOK like admin endpoints but don't
// exist must reject anonymous, never 5xx. Catches sloppy auth wrappers
// that miss "unknown sub-path" cases.

const FAKE_ADMIN_PATHS = [
	'/api/admin/this-endpoint-does-not-exist',
	'/api/admin/categories/../leaked',
	'/api/admin/items/probe/probe/probe',
	'/api/admin/users/abc/def',
	'/api/admin/?probe=1'
];

test.describe('Unknown /api/admin/* paths reject cleanly', () => {
	for (const path of FAKE_ADMIN_PATHS) {
		test(`GET ${path} rejects cleanly`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} must not 5xx`).toBeLessThan(500);
		});

		test(`POST ${path} rejects cleanly`, async ({ request }) => {
			const resp = await request.post(path, { data: { probe: true } });
			const status = resp.status();
			expect(status).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});
