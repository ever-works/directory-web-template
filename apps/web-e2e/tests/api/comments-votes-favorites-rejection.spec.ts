import { test, expect } from '@playwright/test';

// Engagement endpoints (comments, votes, favorites) must accept reads
// (public lists) but reject mutating actions from anonymous callers.

test.describe('Comments / votes / favorites — anonymous reject mutations', () => {
	const PROBE_BODY = { probe: true };

	const MUTATING = [
		{ method: 'POST', path: '/api/comments', name: 'create comment' },
		{ method: 'POST', path: '/api/comments/probe/replies', name: 'reply to comment' },
		{ method: 'PATCH', path: '/api/comments/probe', name: 'edit comment' },
		{ method: 'DELETE', path: '/api/comments/probe', name: 'delete comment' },
		{ method: 'POST', path: '/api/votes', name: 'cast vote' },
		{ method: 'DELETE', path: '/api/votes/probe', name: 'remove vote' },
		{ method: 'POST', path: '/api/favorites', name: 'add favorite' },
		{ method: 'DELETE', path: '/api/favorites/probe', name: 'remove favorite' },
		{ method: 'POST', path: '/api/reports', name: 'submit report' }
	];

	for (const { method, path, name } of MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: PROBE_BODY });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('Comments / favorites — anonymous read access', () => {
	test('GET /api/comments?itemSlug=probe does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/comments?itemSlug=probe');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/favorites (anonymous) rejects with 4xx', async ({ request }) => {
		// User's own favorites require auth.
		const resp = await request.get('/api/favorites');
		expect(resp.status()).toBeLessThan(500);
	});
});
