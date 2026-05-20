import { test, expect } from '@playwright/test';

// POST endpoints must not 5xx on malformed body / wrong content-type.
// Auth-required mutating endpoints: anonymous still gets 4xx (401/403/415/400),
// never 5xx.

const POST_ENDPOINTS = [
	'/api/auth/change-password',
	'/api/stripe/checkout',
	'/api/stripe/setup-intent',
	'/api/stripe/payment-intent',
	'/api/polar/checkout',
	'/api/lemonsqueezy/checkout',
	'/api/solidgate/checkout',
	'/api/sponsor-ads/checkout',
	'/api/verify-recaptcha',
	'/api/extract',
	'/api/reports',
	'/api/admin/items',
	'/api/admin/categories',
	'/api/client/items'
];

// Endpoints whose documented contract is "feature-disabled gate fires
// BEFORE body parse" — they answer EVERY POST with a 200 + a degraded
// envelope when the underlying feature isn't configured (which is the
// case in CI). For these, only the non-5xx invariant applies; the
// "must be 4xx for text/plain" assertion is incompatible with the
// route's own documented behavior.
const FEATURE_DISABLED_OK_PATHS = new Set<string>(['/api/extract']);

test.describe('POST malformed-body tolerance', () => {
	for (const path of POST_ENDPOINTS) {
		test(`${path} with text/plain garbage non-5xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'text/plain' },
				data: 'this is not json'
			});
			expect(resp.status(), `${path}`).toBeLessThan(500);
			if (!FEATURE_DISABLED_OK_PATHS.has(path)) {
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			}
		});

		test(`${path} with empty body non-5xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'application/json' },
				data: ''
			});
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});

		test(`${path} with malformed JSON non-5xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'application/json' },
				data: '{ "broken: '
			});
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});

		test(`${path} with xml content-type non-5xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'application/xml' },
				data: '<x/>'
			});
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}
});
