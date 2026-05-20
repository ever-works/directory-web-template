import { test, expect } from '@playwright/test';

// PUT/PATCH/DELETE on public listing/detail page URLs should return a 4xx
// (typically 405 Method Not Allowed) — never 5xx. The framework should
// canonicalise the rejection.

const PUBLIC_PAGES = [
	'/',
	'/discover',
	'/categories',
	'/tags',
	'/collections',
	'/about',
	'/pricing',
];

const NON_GET_METHODS: Array<'PUT' | 'PATCH' | 'DELETE'> = ['PUT', 'PATCH', 'DELETE'];

test.describe('Public pages: write-method error shape', () => {
	for (const path of PUBLIC_PAGES) {
		for (const method of NON_GET_METHODS) {
			test(`${method} ${path} returns 4xx, not 5xx`, async ({ request }) => {
				const resp = await request.fetch(path, { method });
				expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
				expect(resp.status(), `${method} ${path}`).toBeGreaterThanOrEqual(400);
			});
		}
	}
});
