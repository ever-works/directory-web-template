import { test, expect } from '@playwright/test';

// Anonymous: every common verb against several admin endpoints must
// non-5xx and >= 400.

const ENDPOINTS = ['/api/admin/items', '/api/admin/users', '/api/admin/categories'];
const VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

test.describe('Admin endpoint full verb flood', () => {
	for (const path of ENDPOINTS) {
		for (const method of VERBS) {
			test(`${method} ${path} rejects anonymous`, async ({ request }) => {
				const resp = await request.fetch(path, {
					method,
					data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
				});
				expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			});
		}
	}
});
