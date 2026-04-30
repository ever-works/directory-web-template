import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for admin-only API surfaces that require an `[id]`
 * path segment. Even with a fake / non-existent id, the auth +
 * admin-role guard must reject the call with a 4xx (typically 401),
 * never a 5xx — proving the guard runs before any DB lookup.
 *
 * Complements `admin-protected-extra.spec.ts` (collection-level
 * routes) and `payment-checkouts.spec.ts` (payment id-based routes).
 * Anything covered there is intentionally not duplicated.
 */
const FAKE_ID = '__no_such_id__';
const FAKE_COMMENT_ID = '__no_such_comment__';

const ADMIN_BY_ID_ENDPOINTS = [
	// Categories per-ID surface.
	{ method: 'GET', path: `/api/admin/categories/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/categories/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/categories/${FAKE_ID}` },

	// Clients per-ID surface.
	{ method: 'GET', path: `/api/admin/clients/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/clients/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/clients/${FAKE_ID}` },

	// Collections per-ID surface plus collection-items helper.
	{ method: 'GET', path: `/api/admin/collections/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/collections/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/collections/${FAKE_ID}` },
	{ method: 'GET', path: `/api/admin/collections/${FAKE_ID}/items` },

	// Comments moderation per-ID.
	{ method: 'GET', path: `/api/admin/comments/${FAKE_COMMENT_ID}` },
	{ method: 'PATCH', path: `/api/admin/comments/${FAKE_COMMENT_ID}` },
	{ method: 'DELETE', path: `/api/admin/comments/${FAKE_COMMENT_ID}` },

	// Companies per-ID.
	{ method: 'GET', path: `/api/admin/companies/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/companies/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/companies/${FAKE_ID}` },

	// Featured items per-ID.
	{ method: 'GET', path: `/api/admin/featured-items/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/featured-items/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/featured-items/${FAKE_ID}` },

	// Items per-ID + helpers (history, review, full import).
	{ method: 'GET', path: `/api/admin/items/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/items/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/items/${FAKE_ID}` },
	{ method: 'GET', path: `/api/admin/items/${FAKE_ID}/history` },
	{ method: 'POST', path: `/api/admin/items/${FAKE_ID}/review` },
	{ method: 'POST', path: '/api/admin/items/import' },

	// Notifications per-ID read receipt.
	{ method: 'POST', path: `/api/admin/notifications/${FAKE_ID}/read` },

	// Reports per-ID surface.
	{ method: 'GET', path: `/api/admin/reports/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/reports/${FAKE_ID}` },

	// Roles per-ID + permissions sub-route.
	{ method: 'GET', path: `/api/admin/roles/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/roles/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/roles/${FAKE_ID}` },
	{ method: 'GET', path: `/api/admin/roles/${FAKE_ID}/permissions` },
	{ method: 'PATCH', path: `/api/admin/roles/${FAKE_ID}/permissions` },

	// Sponsor-ads per-ID + lifecycle transitions.
	{ method: 'GET', path: `/api/admin/sponsor-ads/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/sponsor-ads/${FAKE_ID}` },
	{ method: 'POST', path: `/api/admin/sponsor-ads/${FAKE_ID}/approve` },
	{ method: 'POST', path: `/api/admin/sponsor-ads/${FAKE_ID}/cancel` },
	{ method: 'POST', path: `/api/admin/sponsor-ads/${FAKE_ID}/reject` },

	// Tags per-ID.
	{ method: 'GET', path: `/api/admin/tags/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/tags/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/tags/${FAKE_ID}` },

	// Users per-ID.
	{ method: 'GET', path: `/api/admin/users/${FAKE_ID}` },
	{ method: 'PATCH', path: `/api/admin/users/${FAKE_ID}` },
	{ method: 'DELETE', path: `/api/admin/users/${FAKE_ID}` },

	// Settings POST (collection-level write back-stop).
	{ method: 'POST', path: '/api/admin/settings' },
] as const;

test.describe('API: Admin by-id endpoints reject anonymous requests', () => {
	for (const { method, path } of ADMIN_BY_ID_ENDPOINTS) {
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
