import { test, expect } from '@playwright/test';

// Webhook endpoints accept POST. Non-POST verbs must 405/400, never 5xx.

const WEBHOOK_PATHS = [
	'/api/stripe/webhook',
	'/api/polar/webhook',
	'/api/solidgate/webhook',
	'/api/lemonsqueezy/webhook'
];

const BAD_VERBS = ['GET', 'PUT', 'DELETE', 'PATCH'] as const;

test.describe('Webhook endpoints reject non-POST verbs', () => {
	for (const path of WEBHOOK_PATHS) {
		for (const method of BAD_VERBS) {
			test(`${method} ${path} non-5xx`, async ({ request }) => {
				const resp = await request.fetch(path, { method });
				expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			});
		}
	}
});
