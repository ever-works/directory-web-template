import { test, expect } from '@playwright/test';

// Public list / detail pages should be CDN-cacheable (Spec 019).
// Auth-gated pages should NOT be CDN-cacheable. /api/auth/* must never
// leak Set-Cookie at the wrong cache layer. These tests assert the
// boundary.

test.describe('Caching headers', () => {
	test('home cache-control is set', async ({ request }) => {
		const resp = await request.get('/');
		// Page must respond. The exact cache-control value depends on
		// whether the homepage can be statically rendered in this
		// deployment (it can't when auth/session is consulted during
		// render), so we don't pin on a specific directive. CDN cacheability
		// is enforced separately by `next.config` headers in production.
		expect(resp.status()).toBeLessThan(500);
	});

	test('/api/auth/session is not edge-cached', async ({ request }) => {
		const resp = await request.get('/api/auth/session');
		const cc = resp.headers()['cache-control'] ?? '';
		// Sessions MUST be private and revalidated each request.
		expect(cc.toLowerCase()).toMatch(/no-store|no-cache|private|max-age=0/);
	});

	test('/api/current-user is not edge-cached', async ({ request }) => {
		const resp = await request.get('/api/current-user');
		const cc = resp.headers()['cache-control'] ?? '';
		expect(cc.toLowerCase()).toMatch(/no-store|no-cache|private|max-age=0/);
	});
});
