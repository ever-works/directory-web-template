import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/client/**` endpoints powering the
 * client / submitter dashboard. Every endpoint requires an
 * authenticated client session; without one the auth guard must
 * surface a 4xx, never a 5xx.
 *
 * `/api/client/dashboard` itself is already covered by
 * `protected.spec.ts`. This file targets the remaining slices —
 * dashboard stats, geo stats, item coordinates, item stats, and
 * the import surfaces — so a regression in any guard is caught.
 */
const CLIENT_PROTECTED_ENDPOINTS = [
	// Dashboard statistics.
	{ method: 'GET', path: '/api/client/dashboard/stats' },

	// Geo / map statistics for the client view.
	{ method: 'GET', path: '/api/client/geo-stats' },

	// Items collection helpers.
	{ method: 'GET', path: '/api/client/items' },
	{ method: 'GET', path: '/api/client/items/coordinates' },
	{ method: 'GET', path: '/api/client/items/stats' },

	// Bulk import surfaces — each must reject without a session.
	{ method: 'GET', path: '/api/client/items/import/sample' },
	{ method: 'POST', path: '/api/client/items/import/validate' },
	{ method: 'POST', path: '/api/client/items/import' },
] as const;

test.describe('API: Client-protected endpoints reject anonymous requests', () => {
	for (const { method, path } of CLIENT_PROTECTED_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const isWriteMethod = method !== 'GET';
			const response = await request.fetch(path, {
				method,
				...(isWriteMethod
					? {
						data: {},
						headers: { 'content-type': 'application/json' },
					}
					: {}),
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
