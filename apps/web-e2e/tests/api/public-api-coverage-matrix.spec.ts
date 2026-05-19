import { test, expect } from '@playwright/test';

// Anonymous coverage matrix for public-readable API endpoints. The principle
// matches `tests/public/route-coverage-matrix.spec.ts`: catch the entire
// "a contract regression silently 500s in CI" class of bugs before they
// reach prod. Behavior-specific assertions live in their dedicated specs;
// this matrix only asserts response code and JSON-shape sanity.
//
// Anything that REQUIRES auth (/api/admin/*, /api/user/*) is expected to
// return 401/403 anonymously and is asserted in the protected-endpoints
// matrix below.

const PUBLIC_ENDPOINTS: Array<{
	path: string;
	name: string;
	expectJson?: boolean;
	allow404?: boolean;
	/** Allow a 503 in addition to the 2xx happy path (for endpoints
	 *  that explicitly degrade with "not_provisioned" when the
	 *  underlying integration is unconfigured). */
	allow503?: boolean;
}> = [
	{ path: '/api/version', name: 'Version', allow404: true },
	{ path: '/api/config', name: 'Config' },
	// `/items.json` (no /api/ prefix) is the canonical public-data
	// endpoint.
	{ path: '/items.json', name: 'Items JSON' },
	// Same — public `/llms.txt`.
	{ path: '/llms.txt', name: 'llms.txt', expectJson: false },
	{ path: '/api/auth/providers', name: 'NextAuth providers' },
	{ path: '/api/auth/csrf', name: 'NextAuth CSRF' },
	{ path: '/api/auth/session', name: 'NextAuth session (anonymous)', expectJson: false },
	{ path: '/api/current-user', name: 'Current user (anonymous → null)', expectJson: false },
	{ path: '/api/user/currency', name: 'User currency' },
	// Platform activity feed legitimately returns 503 (not_provisioned)
	// when `PLATFORM_SYNC_SECRET` is unset (the CI case).
	{ path: '/api/platform/activity-feed', name: 'Platform activity feed', allow404: true, allow503: true }
];

const PROTECTED_ENDPOINTS: Array<{ path: string; name: string }> = [
	{ path: '/api/admin/items', name: 'Admin: items list' },
	{ path: '/api/admin/categories', name: 'Admin: categories list' },
	{ path: '/api/admin/dashboard/stats', name: 'Admin: dashboard stats' },
	{ path: '/api/admin/users', name: 'Admin: users list' },
	{ path: '/api/admin/comments', name: 'Admin: comments list' },
	{ path: '/api/admin/reports', name: 'Admin: reports list' },
	{ path: '/api/admin/roles', name: 'Admin: roles list' },
	{ path: '/api/admin/notifications', name: 'Admin: notifications list' },
	{ path: '/api/admin/featured-items', name: 'Admin: featured items list' },
	{ path: '/api/admin/sponsorships', name: 'Admin: sponsorships list' },
	{ path: '/api/admin/companies', name: 'Admin: companies list' },
	{ path: '/api/admin/collections', name: 'Admin: collections list' },
	{ path: '/api/user/profile', name: 'User profile (auth)' },
	{ path: '/api/user/subscription', name: 'User subscription (auth)' }
];

test.describe('API coverage matrix — anonymous', () => {
	for (const { path, name, expectJson = true, allow503 } of PUBLIC_ENDPOINTS) {
		test(`${name} (${path}) responds non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			if (allow503 && status === 503) {
				// Documented graceful degradation — endpoint correctly
				// signals "not configured / not provisioned".
				return;
			}
			expect(status, `${path} status (got ${status})`).toBeLessThan(500);
			if (expectJson && status >= 200 && status < 300) {
				const contentType = resp.headers()['content-type'] ?? '';
				expect(contentType.toLowerCase()).toContain('application/json');
				// Just confirm body parses; no shape assertion (each endpoint owns its own).
				await resp.json();
			}
		});
	}
});

test.describe('API coverage matrix — protected endpoints reject anonymous', () => {
	for (const { path, name } of PROTECTED_ENDPOINTS) {
		test(`${name} (${path}) returns 401 or 403 for anonymous GET`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			// Accept 401 (preferred) or 403; reject 200 (security regression) and 5xx.
			expect(status, `${path} should reject anonymous (got ${status})`).toBeGreaterThanOrEqual(
				400
			);
			expect(status, `${path} should not 5xx (got ${status})`).toBeLessThan(500);
			// Some routes might 404 if optional features are disabled in CI — that
			// IS a valid "rejection" (no leak) so we accept up to 404.
			expect([401, 403, 404]).toContain(status);
		});
	}
});
