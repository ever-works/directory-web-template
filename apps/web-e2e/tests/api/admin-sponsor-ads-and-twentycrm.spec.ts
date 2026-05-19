import { test, expect } from '@playwright/test';

// Admin-side sponsor-ads + TwentyCRM endpoints. The user-side sponsor-ads
// are covered in sponsor-ads-api-rejection.spec.ts.

const SPONSOR_ADS_ADMIN = [
	{ method: 'GET', path: '/api/admin/sponsor-ads', name: 'list sponsor ads' },
	{ method: 'POST', path: '/api/admin/sponsor-ads', name: 'create sponsor ad' },
	{ method: 'GET', path: '/api/admin/sponsor-ads/probe', name: 'sponsor ad detail' },
	{ method: 'PATCH', path: '/api/admin/sponsor-ads/probe', name: 'patch sponsor ad' },
	{ method: 'DELETE', path: '/api/admin/sponsor-ads/probe', name: 'delete sponsor ad' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe/approve', name: 'approve sponsor ad' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe/reject', name: 'reject sponsor ad' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe/cancel', name: 'cancel sponsor ad' }
];

test.describe('Admin sponsor-ads API rejects anonymous', () => {
	for (const { method, path, name } of SPONSOR_ADS_ADMIN) {
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

test.describe('Admin TwentyCRM integration endpoints reject anonymous', () => {
	const TWENTY_CRM = [
		{ method: 'GET', path: '/api/admin/twenty-crm/config', name: 'crm config get' },
		{ method: 'POST', path: '/api/admin/twenty-crm/config', name: 'crm config set' },
		{ method: 'POST', path: '/api/admin/twenty-crm/test-connection', name: 'crm test connection' }
	];

	for (const { method, path, name } of TWENTY_CRM) {
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

test.describe('Admin settings + map-status reject anonymous', () => {
	test('GET /api/admin/settings rejects anonymous', async ({ request }) => {
		const resp = await request.get('/api/admin/settings');
		expect(resp.status()).toBeGreaterThanOrEqual(400);
		expect(resp.status()).toBeLessThan(500);
	});

	test('PATCH /api/admin/settings rejects anonymous', async ({ request }) => {
		const resp = await request.patch('/api/admin/settings', { data: { probe: true } });
		expect(resp.status()).toBeGreaterThanOrEqual(400);
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/admin/settings/map-status rejects anonymous', async ({ request }) => {
		const resp = await request.get('/api/admin/settings/map-status');
		expect(resp.status()).toBeGreaterThanOrEqual(400);
		expect(resp.status()).toBeLessThan(500);
	});
});
