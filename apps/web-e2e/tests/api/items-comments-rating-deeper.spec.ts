import { test, expect } from '@playwright/test';

// Comments and ratings nested endpoints. Anonymous probes must reject
// mutating verbs (POST/PUT/PATCH/DELETE), GETs may legitimately return
// data — but must never 5xx.

const NESTED_PROBES = [
	{ method: 'GET', path: '/api/items/probe-slug/comments' },
	{ method: 'POST', path: '/api/items/probe-slug/comments' },
	{ method: 'GET', path: '/api/items/probe-slug/comments/probe-comment-id' },
	{ method: 'PUT', path: '/api/items/probe-slug/comments/probe-comment-id' },
	{ method: 'DELETE', path: '/api/items/probe-slug/comments/probe-comment-id' },
	{ method: 'GET', path: '/api/items/probe-slug/comments/rating' },
	{ method: 'POST', path: '/api/items/probe-slug/comments/rating' },
	{ method: 'GET', path: '/api/items/probe-slug/comments/rating/probe-comment-id' },
	{ method: 'PATCH', path: '/api/items/probe-slug/comments/rating/probe-comment-id' },
	{ method: 'PUT', path: '/api/items/probe-slug/comments/rating/probe-comment-id' },
	{ method: 'DELETE', path: '/api/items/probe-slug/comments/rating/probe-comment-id' }
];

test.describe('Items comments/rating anonymous behavior', () => {
	for (const { method, path } of NESTED_PROBES) {
		test(`${method} ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			if (method !== 'GET') {
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			}
		});
	}
});
