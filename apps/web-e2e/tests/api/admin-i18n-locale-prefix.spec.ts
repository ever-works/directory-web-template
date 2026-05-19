import { test, expect } from '@playwright/test';

// API endpoints under locale prefix — /<locale>/api/* is NOT a real route
// pattern (apps/web/app/api/*) but probe it anyway to make sure framework
// doesn't 5xx.

const LOCALES = ['en', 'fr'];
const PATHS = [
	'/api/items.json',
	'/api/featured-items',
	'/api/version',
	'/api/tenant'
];

test.describe('API endpoints with locale prefix tolerance', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`GET /${loc}${p} non-5xx`, async ({ request }) => {
				const resp = await request.get(`/${loc}${p}`);
				expect(resp.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
