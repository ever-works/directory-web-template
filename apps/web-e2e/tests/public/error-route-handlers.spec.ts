import { test, expect } from '@playwright/test';

// Trying to break specific App Router error/not-found/loading boundaries
// via direct URL. The framework owns these — they should never be reachable
// directly and must 404, not 5xx.

const ROUTE_INTERNALS = [
	'/error',
	'/not-found',
	'/loading',
	'/about/error',
	'/about/not-found',
	'/about/loading',
	'/items/error',
	'/items/not-found',
	'/items/loading',
	'/items/sample/error',
	'/items/sample/not-found',
	'/items/sample/loading'
];

test.describe('App Router special files not directly addressable', () => {
	for (const path of ROUTE_INTERNALS) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
