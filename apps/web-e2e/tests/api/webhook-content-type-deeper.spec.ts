import { test, expect } from '@playwright/test';

// Webhook endpoints with wrong content-type / wrong signature must
// reject without 5xx.

const HOOKS = [
	'/api/stripe/webhook',
	'/api/polar/webhook',
	'/api/solidgate/webhook',
	'/api/lemonsqueezy/webhook'
];

test.describe('Webhook content-type / signature edges', () => {
	for (const path of HOOKS) {
		test(`POST ${path} with text/plain non-2xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'text/plain' },
				data: 'not a real webhook'
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});

		test(`POST ${path} with multipart non-2xx`, async ({ request }) => {
			const resp = await request.post(path, {
				multipart: { field: 'value' }
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});

		test(`POST ${path} with empty body non-2xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'application/json' },
				data: ''
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
