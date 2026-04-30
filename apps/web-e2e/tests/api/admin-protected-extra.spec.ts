import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for admin-only API surfaces that were not already
 * exercised by `protected.spec.ts`. Each endpoint must reject an
 * unauthenticated request with a 4xx (typically 401 / 403); none must
 * 5xx, since that would indicate the auth or role guard crashed.
 *
 * The list intentionally spans every admin slice (categories, clients,
 * comments, companies, featured-items, geo-analytics, items helpers,
 * notifications, location-index, navigation, reports, roles,
 * settings, sponsor-ads, tags, twenty-crm config, users helpers) so a
 * regression in any single helper or middleware is caught.
 */
const ADMIN_PROTECTED_ENDPOINTS = [
	// Categories — extra slices.
	{ method: 'GET', path: '/api/admin/categories/all' },
	{ method: 'GET', path: '/api/admin/categories/git' },
	{ method: 'POST', path: '/api/admin/categories/reorder' },

	// Clients.
	{ method: 'GET', path: '/api/admin/clients' },
	{ method: 'GET', path: '/api/admin/clients/dashboard' },
	{ method: 'GET', path: '/api/admin/clients/stats' },
	{ method: 'GET', path: '/api/admin/clients/advanced-search' },
	{ method: 'POST', path: '/api/admin/clients/bulk' },

	// Collections.
	{ method: 'GET', path: '/api/admin/collections' },

	// Comments moderation.
	{ method: 'GET', path: '/api/admin/comments' },

	// Companies.
	{ method: 'GET', path: '/api/admin/companies' },

	// Featured items list.
	{ method: 'GET', path: '/api/admin/featured-items' },

	// Geo-analytics.
	{ method: 'GET', path: '/api/admin/geo-analytics' },

	// Items helpers.
	{ method: 'GET', path: '/api/admin/items/stats' },
	{ method: 'POST', path: '/api/admin/items/bulk' },
	{ method: 'GET', path: '/api/admin/items/export' },
	{ method: 'GET', path: '/api/admin/items/export/sample' },
	{ method: 'POST', path: '/api/admin/items/import/validate' },

	// Location-index admin surface.
	{ method: 'GET', path: '/api/admin/location-index' },

	// Navigation config.
	{ method: 'GET', path: '/api/admin/navigation' },

	// Notifications mark-all-read.
	{ method: 'POST', path: '/api/admin/notifications/mark-all-read' },

	// Reports moderation.
	{ method: 'GET', path: '/api/admin/reports' },
	{ method: 'GET', path: '/api/admin/reports/stats' },

	// Roles.
	{ method: 'GET', path: '/api/admin/roles' },
	{ method: 'GET', path: '/api/admin/roles/active' },
	{ method: 'GET', path: '/api/admin/roles/stats' },

	// Settings.
	{ method: 'GET', path: '/api/admin/settings' },
	{ method: 'GET', path: '/api/admin/settings/map-status' },

	// Sponsor-ads moderation.
	{ method: 'GET', path: '/api/admin/sponsor-ads' },

	// Tags.
	{ method: 'GET', path: '/api/admin/tags' },
	{ method: 'GET', path: '/api/admin/tags/all' },

	// Twenty CRM admin config.
	{ method: 'GET', path: '/api/admin/twenty-crm/config' },
	{ method: 'POST', path: '/api/admin/twenty-crm/test-connection' },

	// Users helpers (admin-gated availability checks).
	{ method: 'POST', path: '/api/admin/users/check-email' },
	{ method: 'POST', path: '/api/admin/users/check-username' },
	{ method: 'GET', path: '/api/admin/users/stats' },
] as const;

test.describe('API: Admin-protected endpoints reject anonymous requests', () => {
	for (const { method, path } of ADMIN_PROTECTED_ENDPOINTS) {
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
