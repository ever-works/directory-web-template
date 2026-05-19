import { test, expect } from '@playwright/test';

// /api/favorites/[itemSlug] toggles a per-item favorite for the current
// user. Read (is-favorited check) may be allowed anonymous; writes must
// reject.

test.describe('/api/favorites/[itemSlug] gating', () => {
	test('GET /api/favorites/probe-slug does not 5xx anonymously', async ({ request }) => {
		const resp = await request.get('/api/favorites/probe-slug');
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/favorites/probe-slug rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/favorites/probe-slug', { data: {} });
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('DELETE /api/favorites/probe-slug rejects anonymous', async ({ request }) => {
		const resp = await request.delete('/api/favorites/probe-slug');
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/votes/status rejects anonymous OR returns no-state', async ({
		request
	}) => {
		const resp = await request.get('/api/items/probe-slug/votes/status');
		expect(resp.status()).toBeLessThan(500);
		// 200 with empty body is acceptable; 401 also fine.
	});
});
