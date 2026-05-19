import { test, expect } from '@playwright/test';

// HEAD requests must non-5xx and not return a body. Required for many
// crawlers and load balancers.

const PROBES = [
	'/',
	'/about',
	'/discover/1',
	'/categories',
	'/tags',
	'/api/items.json',
	'/api/health',
	'/api/version',
	'/api/tenant',
	'/api/auth/session',
	'/sitemap.xml',
	'/robots.txt'
];

test.describe('HEAD request tolerance', () => {
	for (const path of PROBES) {
		test(`HEAD ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'HEAD' });
			expect(resp.status(), `HEAD ${path}`).toBeLessThan(500);
		});
	}
});
