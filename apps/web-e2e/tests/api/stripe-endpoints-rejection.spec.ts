import { test, expect } from '@playwright/test';

// Stripe surface must reject anonymous and refuse webhook calls without a
// valid signature. Without these gates we have a billing-data leak / forged
// webhook risk. The full happy path is owned by the dedicated billing
// specs; this matrix just asserts the negative-case contracts.

const STRIPE_USER_GET_ENDPOINTS = [
	'/api/stripe/subscription',
	'/api/stripe/subscriptions',
	'/api/stripe/products',
	'/api/stripe/payment-methods/list'
];

const STRIPE_USER_POST_ENDPOINTS = [
	'/api/stripe/checkout',
	'/api/stripe/payment-intent',
	'/api/stripe/payment-methods/create',
	'/api/stripe/setup-intent',
	'/api/stripe/subscription/portal'
];

test.describe('Stripe API — anonymous rejection', () => {
	for (const path of STRIPE_USER_GET_ENDPOINTS) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} must not 5xx`).toBeLessThan(500);
		});
	}

	for (const path of STRIPE_USER_POST_ENDPOINTS) {
		test(`POST ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.post(path, { data: { probe: true } });
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} must not 5xx`).toBeLessThan(500);
		});
	}
});

test.describe('Stripe webhook rejects forged calls', () => {
	test('POST /api/stripe/webhook without signature does not 5xx and is rejected', async ({
		request
	}) => {
		const resp = await request.post('/api/stripe/webhook', {
			data: { type: 'fake.event', data: { object: { id: 'evt_fake' } } },
			headers: { 'content-type': 'application/json' }
		});
		const status = resp.status();
		// 400/401/403 are all valid rejection codes for a missing/invalid
		// stripe-signature header. NEVER 200, NEVER 5xx.
		expect(status, `webhook should reject unsigned (got ${status})`).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
		expect([400, 401, 403]).toContain(status);
	});

	test('POST /api/stripe/webhook with garbage signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/stripe/webhook', {
			data: '{"type":"fake.event"}',
			headers: {
				'content-type': 'application/json',
				'stripe-signature': 't=1,v1=garbage,v0=garbage'
			}
		});
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});
});
