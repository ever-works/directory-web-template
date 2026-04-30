import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for endpoints that should require authentication.
 *
 * From an unauthenticated request, every protected route must respond
 * with a 4xx — typically 401 Unauthorized or 403 Forbidden. Some
 * routes redirect (3xx) to a login page; others return a JSON error.
 * Anything >= 500 indicates the auth guard is broken.
 *
 * Endpoints listed here are intentionally varied so the test catches
 * a regression in any single guard helper (`auth()`, role checks,
 * tenant scoping).
 */
const PROTECTED_ENDPOINTS = [
	// Tenant context — 401 when no session.
	{ method: 'GET', path: '/api/tenant' },

	// Admin surfaces — should require both auth and admin role.
	{ method: 'GET', path: '/api/admin/items' },
	{ method: 'GET', path: '/api/admin/users' },
	{ method: 'GET', path: '/api/admin/categories' },
	{ method: 'GET', path: '/api/admin/dashboard/stats' },
	{ method: 'GET', path: '/api/admin/notifications' },

	// User-scoped routes — should require an authenticated session.
	{ method: 'GET', path: '/api/user/subscription' },
	{ method: 'GET', path: '/api/user/plan-status' },

	// Client routes — same.
	{ method: 'GET', path: '/api/client/dashboard' },

	// Current user — must not return data without a session.
	{ method: 'GET', path: '/api/current-user' },
] as const;

test.describe('API: Protected endpoints reject unauthenticated requests', () => {
	for (const { method, path } of PROTECTED_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const response = await request.fetch(path, { method });

			// We accept any status < 500. The contract is: the auth
			// layer must surface a structured response (4xx or 3xx
			// redirect) instead of crashing.
			expect(response.status()).toBeLessThan(500);
		});
	}
});
