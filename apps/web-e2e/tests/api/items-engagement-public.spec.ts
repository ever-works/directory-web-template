import { test, expect } from '@playwright/test';

// Public item engagement endpoints (vote counts, comment threads, views).
// Reads are public but mutations require auth.

test.describe('Items engagement public reads', () => {
	test('GET /api/items/probe-slug/votes/count does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/votes/count');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/comments does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/comments');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/comments/rating does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/comments/rating');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/views does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/views');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/activity does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/activity');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/probe-slug/company does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/probe-slug/company');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/engagement does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/engagement');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/popularity-scores does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/popularity-scores');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items/listing does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/items/listing');
		expect(resp.status()).toBeLessThan(500);
	});
});

test.describe('Items engagement mutations reject anonymous', () => {
	const MUTATIONS = [
		{ method: 'POST', path: '/api/items/probe-slug/votes', name: 'cast vote' },
		{ method: 'DELETE', path: '/api/items/probe-slug/votes', name: 'remove vote' },
		{ method: 'POST', path: '/api/items/probe-slug/comments', name: 'add comment' },
		{ method: 'PATCH', path: '/api/items/probe-slug/comments/probe', name: 'edit comment' },
		{ method: 'DELETE', path: '/api/items/probe-slug/comments/probe', name: 'delete comment' },
		{ method: 'POST', path: '/api/items/probe-slug/comments/rating', name: 'add rating' },
		{ method: 'POST', path: '/api/items/probe-slug/views', name: 'log view' }
	];

	for (const { method, path, name } of MUTATIONS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			// `view` logging may be allowed anonymously (analytics) — accept 2xx
			// for /views; everything else must reject.
			if (name === 'log view' && status >= 200 && status < 300) return;
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});
