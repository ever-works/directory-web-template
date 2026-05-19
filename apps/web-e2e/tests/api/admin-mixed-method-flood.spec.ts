import { test, expect } from '@playwright/test';

const ENDPOINTS = [
	'/api/admin/sponsor-ads',
	'/api/admin/comments',
	'/api/admin/featured-items',
	'/api/admin/collections',
	'/api/admin/companies'
];
const VERBS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

test.describe('Admin endpoint full verb flood (round 17)', () => {
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
