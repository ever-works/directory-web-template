import { test, expect } from '@playwright/test';

// Item / category / tag detail under each locale prefix — non-5xx.

const LOCALES = ['en', 'fr', 'es', 'de'];
const PATHS = [
	'/items/sample',
	'/items/does-not-exist',
	'/categories/sample',
	'/tags/sample',
	'/collections/sample',
	'/surveys/sample',
	'/comparisons/sample'
];

test.describe('Detail routes under locale prefix', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`/${loc}${p} non-5xx`, async ({ request }) => {
				const resp = await request.get(`/${loc}${p}`);
				expect(resp.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
