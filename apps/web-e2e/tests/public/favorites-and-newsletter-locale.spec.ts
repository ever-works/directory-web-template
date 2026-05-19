import { test, expect } from '@playwright/test';

const LOCALES = ['en', 'fr', 'es', 'de'];

test.describe('Favorites + newsletter locale prefix tolerance', () => {
	for (const loc of LOCALES) {
		test(`/${loc}/favorites non-5xx (anonymous)`, async ({ request }) => {
			const resp = await request.get(`/${loc}/favorites`);
			expect(resp.status(), `/${loc}/favorites`).toBeLessThan(500);
		});

		test(`/${loc}/newsletter/unsubscribe non-5xx`, async ({ request }) => {
			const resp = await request.get(`/${loc}/newsletter/unsubscribe`);
			expect(resp.status(), `/${loc}/newsletter/unsubscribe`).toBeLessThan(500);
		});

		test(`/${loc}/map non-5xx`, async ({ request }) => {
			const resp = await request.get(`/${loc}/map`);
			expect(resp.status(), `/${loc}/map`).toBeLessThan(500);
		});

		test(`/${loc}/submit non-5xx`, async ({ request }) => {
			const resp = await request.get(`/${loc}/submit`);
			expect(resp.status(), `/${loc}/submit`).toBeLessThan(500);
		});
	}
});
