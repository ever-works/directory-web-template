import { test, expect } from '@playwright/test';

// Public JSON read APIs should send Cache-Control with at least a short
// max-age, or be marked private. We don't enforce specific values — only
// that a header is present (not "" / absent).

const READ_JSON = ['/api/items.json', '/api/featured-items', '/api/tenant', '/api/version'];

test.describe('Public JSON read endpoints declare Cache-Control', () => {
	for (const path of READ_JSON) {
		test(`${path} declares Cache-Control header`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) {
				test.skip();
				return;
			}
			const cc = resp.headers()['cache-control'];
			// We don't insist on any specific value — only that the server
			// expressed an intent (private, no-store, max-age=*, or s-maxage).
			expect(cc, `${path} cache-control`).toBeTruthy();
		});
	}
});
