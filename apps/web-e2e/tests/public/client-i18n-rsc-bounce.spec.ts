import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'fr', 'es', 'de'];
const PATHS = ['/client/dashboard', '/client/settings', '/dashboard/billing', '/favorites'];

test.describe('Locale prefix × client × RSC anonymous bounce', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`/${loc}${p}?_rsc=abc non-5xx`, async ({ request }) => {
				const resp = await request.get(`/${loc}${p}?_rsc=abc`);
				expect(resp.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
