import { test, expect } from '@playwright/test';

// Swagger / OpenAPI docs (if exposed) must non-5xx and not leak secrets.

const PROBES = [
	'/api-docs',
	'/api/docs',
	'/api/swagger',
	'/swagger',
	'/openapi.json',
	'/api/openapi',
	'/api/openapi.json'
];

const FORBIDDEN_NEEDLES = [
	'POSTGRES_PASSWORD',
	'AUTH_SECRET',
	'COOKIE_SECRET',
	'STRIPE_SECRET_KEY',
	'OPENAI_API_KEY'
];

test.describe('Swagger / OpenAPI probe tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`${path} body does not leak server secrets`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const txt = await resp.text();
			for (const needle of FORBIDDEN_NEEDLES) {
				expect(txt.toLowerCase().includes(needle.toLowerCase()), `${path} leaks ${needle}`).toBe(
					false
				);
			}
		});
	}
});
