import { test, expect } from '@playwright/test';

// Locale-prefixed admin + RSC suffix bounce. Anonymous must non-5xx.

const LOCALES = ['en', 'fr', 'es', 'de'];

test.describe('Locale prefix × admin × RSC anonymous bounce', () => {
	for (const loc of LOCALES) {
		test(`/${loc}/admin?_rsc=abc non-5xx`, async ({ request }) => {
			const resp = await request.get(`/${loc}/admin?_rsc=abc`);
			expect(resp.status(), `/${loc}/admin`).toBeLessThan(500);
		});

		test(`/${loc}/admin/items with RSC header non-5xx`, async ({ request }) => {
			const resp = await request.get(`/${loc}/admin/items`, { headers: { RSC: '1' } });
			expect(resp.status(), `/${loc}/admin/items`).toBeLessThan(500);
		});
	}
});
