import { test, expect } from '@playwright/test';

// Admin export endpoints — anonymous probes with various Accept headers.

const PROBES = [
	'/api/admin/items/export',
	'/api/admin/items/export/sample',
	'/api/items/export',
	'/api/items/export/settings'
];

const ACCEPT_HEADERS = ['application/json', 'text/csv', 'application/xml', '*/*'];

test.describe('Export endpoint Accept-header tolerance', () => {
	for (const path of PROBES) {
		for (const accept of ACCEPT_HEADERS) {
			test(`GET ${path} Accept=${accept} non-5xx`, async ({ request }) => {
				const resp = await request.get(path, { headers: { accept } });
				expect(resp.status(), `${path} Accept=${accept}`).toBeLessThan(500);
			});
		}
	}
});
