import { test, expect } from '@playwright/test';

// Deeper checks for Polar + Solidgate / sponsor-ads checkout endpoints
// with malformed bodies. Goal: no 5xx, no 200 on unauthenticated probes.

const POSTS = [
	'/api/polar/checkout',
	'/api/polar/subscription/portal',
	'/api/solidgate/checkout',
	'/api/sponsor-ads/checkout',
	'/api/stripe/checkout',
	'/api/lemonsqueezy/checkout'
];

test.describe('Payment provider POSTs deeper', () => {
	for (const path of POSTS) {
		test(`POST ${path} with empty body non-2xx`, async ({ request }) => {
			const resp = await request.post(path, {
				headers: { 'content-type': 'application/json' },
				data: ''
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).not.toBe(200);
		});

		test(`POST ${path} with hostile JSON non-2xx`, async ({ request }) => {
			const resp = await request.post(path, {
				data: { __proto__: { polluted: true }, constructor: { prototype: { polluted: true } } }
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).not.toBe(200);
		});

		test(`POST ${path} with deeply-nested body non-5xx`, async ({ request }) => {
			let nest: Record<string, unknown> = { v: 1 };
			for (let i = 0; i < 50; i++) nest = { x: nest };
			const resp = await request.post(path, { data: nest });
			expect(resp.status()).toBeLessThan(500);
		});
	}
});
