import { test, expect } from '@playwright/test';

// Routes that 308/307 redirect should land somewhere reachable.

const REDIRECT_PROBES = [
	'/discover',      // may 308 to /discover/1
	'/collections/paging',
	'/tags/paging'
];

test.describe('Redirect target reachable', () => {
	for (const path of REDIRECT_PROBES) {
		test(`${path} -> redirect chain ends non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { maxRedirects: 5 });
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
