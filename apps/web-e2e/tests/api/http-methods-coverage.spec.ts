import { test, expect } from '@playwright/test';

// Each route handler explicitly exports only the HTTP verbs it implements.
// Calling a non-implemented verb should return 405 (Method Not Allowed),
// NOT 500 or 200. Catches the class of "an OPTIONS preflight crashes the
// route" bugs.

const GET_ONLY_ENDPOINTS = [
	'/api/version',
	'/api/config',
	'/api/auth/providers',
	'/api/auth/csrf',
	'/api/auth/session',
	'/api/current-user',
	'/api/user/currency',
	'/api/items.json'
];

test.describe('API HTTP method rejection', () => {
	for (const path of GET_ONLY_ENDPOINTS) {
		test(`POST ${path} returns 4xx (not 5xx)`, async ({ request }) => {
			const resp = await request.post(path, { data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} POST status (got ${status})`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			// 405 is correct; 401/403/404 are also acceptable.
			expect([400, 401, 403, 404, 405]).toContain(status);
		});

		test(`DELETE ${path} returns 4xx (not 5xx)`, async ({ request }) => {
			const resp = await request.delete(path);
			const status = resp.status();
			expect(status).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}

	test('OPTIONS on a GET endpoint does not 500', async ({ request }) => {
		const resp = await request.fetch('/api/auth/session', { method: 'OPTIONS' });
		// OPTIONS is allowed for CORS preflight; just ensure no server crash.
		expect(resp.status()).toBeLessThan(500);
	});
});
