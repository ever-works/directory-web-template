import { test, expect } from '@playwright/test';

// Items engagement endpoints. Items/[slug]/views, /votes, /votes/status,
// /comments/rating — anonymous behavior must never 5xx.

const ENGAGEMENT_PROBES = [
	{ method: 'GET', path: '/api/items/probe-slug/votes/count' },
	{ method: 'GET', path: '/api/items/probe-slug/votes/status' },
	{ method: 'POST', path: '/api/items/probe-slug/votes' },
	{ method: 'DELETE', path: '/api/items/probe-slug/votes' },
	{ method: 'GET', path: '/api/items/probe-slug/votes' },
	{ method: 'GET', path: '/api/items/probe-slug/comments' },
	{ method: 'POST', path: '/api/items/probe-slug/comments' },
	{ method: 'GET', path: '/api/items/probe-slug/comments/rating' },
	{ method: 'POST', path: '/api/items/probe-slug/comments/rating' },
	{ method: 'PATCH', path: '/api/items/probe-slug/comments/rating/probe-comment-id' },
	{ method: 'DELETE', path: '/api/items/probe-slug/comments/probe-comment-id' },
	{ method: 'POST', path: '/api/items/probe-slug/views' },
	{ method: 'GET', path: '/api/items/probe-slug/activity' },
	{ method: 'GET', path: '/api/items/probe-slug/company' }
];

test.describe('Items engagement endpoints (deeper)', () => {
	for (const { method, path } of ENGAGEMENT_PROBES) {
		test(`${method} ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
		});
	}
});
