import { test, expect } from '@playwright/test';

/**
 * API contract for `GET /api/payment/public-config` (spec 044).
 *
 * The route serves the browser-safe payment configuration from the server's
 * runtime environment so platform-deployed k8s builds (no inlined
 * `NEXT_PUBLIC_*`) can still render paid plans and load Stripe.js. It must be
 * anonymous, JSON, uncached, expose exactly the four public keys and never
 * leak secret-looking values.
 */

const ENDPOINT = '/api/payment/public-config';
const KNOWN_PROVIDERS = ['stripe', 'lemonsqueezy', 'polar', 'solidgate'];

test.describe('API: /api/payment/public-config', () => {
	test('anonymous GET returns 200 JSON with the four public keys', async ({ request }) => {
		const response = await request.get(ENDPOINT);

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/json');

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual([
			'configuredProviders',
			'demo',
			'dynamicPricing',
			'stripePublishableKey'
		]);

		expect(typeof body.dynamicPricing).toBe('boolean');
		expect(typeof body.demo).toBe('boolean');
		expect(body.stripePublishableKey === null || typeof body.stripePublishableKey === 'string').toBe(true);
		expect(Array.isArray(body.configuredProviders)).toBe(true);
		for (const provider of body.configuredProviders) {
			expect(KNOWN_PROVIDERS).toContain(provider);
		}

		// Stripe is reported as configured iff a publishable key is present.
		expect(body.configuredProviders.includes('stripe')).toBe(Boolean(body.stripePublishableKey));
	});

	test('never exposes secret-looking values', async ({ request }) => {
		const response = await request.get(ENDPOINT);
		expect(response.status()).toBe(200);

		const raw = await response.text();
		expect(raw).not.toMatch(/sk_(live|test)_/);
		expect(raw).not.toMatch(/rk_(live|test)_/);
		expect(raw).not.toMatch(/whsec_/);

		const body = await response.json();
		if (body.stripePublishableKey) {
			expect(body.stripePublishableKey).not.toMatch(/^(sk|rk)_/);
		}
	});

	test('is served uncached', async ({ request }) => {
		const response = await request.get(ENDPOINT);
		expect(response.status()).toBe(200);
		expect(response.headers()['cache-control'] ?? '').toContain('no-store');
	});
});
