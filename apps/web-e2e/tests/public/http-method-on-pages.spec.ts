import { test, expect } from '@playwright/test';

// Pages should respond to GET/HEAD but NOT to POST/PUT/DELETE (those are
// reserved for forms / server actions). A page that 5xxs on a stray POST
// could be DoS'd by scanners.

const PAGES = ['/', '/about', '/auth/signin', '/auth/register', '/categories'];

test.describe('HTTP method tolerance on pages', () => {
	for (const path of PAGES) {
		test(`HEAD ${path} is tolerated`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'HEAD' });
			expect(resp.status(), `HEAD ${path}`).toBeLessThan(500);
		});

		test(`OPTIONS ${path} is tolerated`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'OPTIONS' });
			expect(resp.status(), `OPTIONS ${path}`).toBeLessThan(500);
		});

		test(`PUT ${path} does not 5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'PUT', data: { x: 1 } });
			expect(resp.status(), `PUT ${path}`).toBeLessThan(500);
		});

		test(`DELETE ${path} does not 5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'DELETE' });
			expect(resp.status(), `DELETE ${path}`).toBeLessThan(500);
		});
	}
});
