import { test, expect } from '@playwright/test';

// Admin import endpoints — anonymous + content-type probes.

const PROBES = [
	'/api/admin/items/import',
	'/api/admin/items/import/validate',
	'/api/client/items/import',
	'/api/client/items/import/validate'
];

const CONTENT_TYPES = [
	{ ct: 'application/json', body: '{}' },
	{ ct: 'text/plain', body: 'not json' },
	{ ct: 'multipart/form-data', body: '' },
	{ ct: 'application/x-www-form-urlencoded', body: 'a=b' },
	{ ct: 'application/octet-stream', body: 'binary' },
	{ ct: 'text/csv', body: 'a,b\nc,d' }
];

test.describe('Admin / client import content-type rejection', () => {
	for (const path of PROBES) {
		for (const { ct, body } of CONTENT_TYPES) {
			test(`POST ${path} CT=${ct} non-5xx + 4xx`, async ({ request }) => {
				const resp = await request.post(path, {
					headers: { 'content-type': ct },
					data: body
				});
				expect(resp.status(), `${path} CT=${ct}`).toBeLessThan(500);
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			});
		}
	}
});
