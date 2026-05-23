import { test, expect } from '@playwright/test';

// 4xx JSON responses from common APIs should be JSON with an "error"-like
// field. Not enforced strictly — we only check it parses as JSON when
// the content-type is application/json.

const PROBES = [
	'/api/admin/items',
	'/api/admin/users',
	'/api/client/items',
	'/api/user/profile',
	'/api/stripe/subscription'
];

test.describe('Error JSON shape', () => {
	for (const path of PROBES) {
		test(`GET ${path} 4xx body parses as JSON if CT is json`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() < 400) {
				test.skip();
				return;
			}
			const ct = (resp.headers()['content-type'] || '').toLowerCase();
			if (!ct.includes('application/json')) {
				test.skip();
				return;
			}
			const txt = await resp.text();
			expect(() => JSON.parse(txt)).not.toThrow();
		});
	}
});
