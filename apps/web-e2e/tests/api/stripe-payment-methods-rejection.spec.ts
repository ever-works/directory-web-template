import { test, expect } from '@playwright/test';

// /api/stripe/payment-methods/* covers card/wallet management. All
// endpoints must reject anonymous since they touch billing surfaces.

const PAYMENT_METHODS = [
	{ method: 'GET', path: '/api/stripe/payment-methods/list', name: 'list payment methods' },
	{ method: 'POST', path: '/api/stripe/payment-methods/create', name: 'create' },
	{ method: 'POST', path: '/api/stripe/payment-methods/delete', name: 'delete' },
	{ method: 'POST', path: '/api/stripe/payment-methods/update', name: 'update' },
	{ method: 'GET', path: '/api/stripe/payment-methods/probe-id', name: 'detail' }
];

test.describe('Stripe payment-methods reject anonymous', () => {
	for (const { method, path, name } of PAYMENT_METHODS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method !== 'GET' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('Stripe subscription per-id endpoints reject anonymous', () => {
	const SUB_ENDPOINTS = [
		{ method: 'POST', path: '/api/stripe/subscription/probe/cancel', name: 'cancel sub' },
		{ method: 'POST', path: '/api/stripe/subscription/probe/reactivate', name: 'reactivate sub' },
		{ method: 'POST', path: '/api/stripe/subscription/probe/update', name: 'update sub' },
		{ method: 'GET', path: '/api/stripe/setup-intent/probe', name: 'setup intent detail' }
	];

	for (const { method, path, name } of SUB_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method !== 'GET' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});
