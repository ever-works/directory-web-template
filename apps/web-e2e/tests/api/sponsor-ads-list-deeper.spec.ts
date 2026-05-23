import { test, expect } from '@playwright/test';

// /api/sponsor-ads (list) + /api/sponsor-ads/user + /stats. The list
// endpoint may be public-read. Mutating verbs must reject.

const READ_PROBES = [
	'/api/sponsor-ads',
	'/api/sponsor-ads?placement=top',
	'/api/sponsor-ads?placement=' + encodeURIComponent('NOT-REAL'),
	'/api/sponsor-ads?limit=10',
	'/api/sponsor-ads?limit=-1',
	'/api/sponsor-ads?limit=abc'
];

const MUTATING_PROBES = [
	{ method: 'POST', path: '/api/sponsor-ads' },
	{ method: 'PUT', path: '/api/sponsor-ads' },
	{ method: 'DELETE', path: '/api/sponsor-ads' }
];

test.describe('Sponsor-ads read query tolerance', () => {
	for (const path of READ_PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});

test.describe('Sponsor-ads mutating rejection', () => {
	for (const { method, path } of MUTATING_PROBES) {
		test(`${method} ${path} non-2xx anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: {} });
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
