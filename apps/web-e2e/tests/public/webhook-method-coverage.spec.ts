import { test, expect } from '@playwright/test';

// Webhook endpoints accept POST. Non-POST verbs must never 5xx; most
// should also return 4xx. A handful of endpoints intentionally return
// a 200 informational envelope on GET (e.g. Solidgate — see the comment
// in `apps/web/app/api/solidgate/webhook/route.ts` and the dedicated
// `solidgate-webhook-body` spec that pins that behavior). We exempt
// those from the ≥400 assertion but still require non-5xx.

const WEBHOOK_PATHS = [
	'/api/stripe/webhook',
	'/api/polar/webhook',
	'/api/solidgate/webhook',
	'/api/lemonsqueezy/webhook'
];

const BAD_VERBS = ['GET', 'PUT', 'DELETE', 'PATCH'] as const;

// Endpoints whose GET handler intentionally returns 200 (documented).
const GET_RETURNS_200 = new Set<string>(['/api/solidgate/webhook']);

test.describe('Webhook endpoints reject non-POST verbs', () => {
	for (const path of WEBHOOK_PATHS) {
		for (const method of BAD_VERBS) {
			test(`${method} ${path} non-5xx`, async ({ request }) => {
				const resp = await request.fetch(path, { method });
				expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
				if (method === 'GET' && GET_RETURNS_200.has(path)) {
					expect(resp.status(), `${method} ${path} documented envelope`).toBe(200);
				} else {
					expect(resp.status()).toBeGreaterThanOrEqual(400);
				}
			});
		}
	}
});
