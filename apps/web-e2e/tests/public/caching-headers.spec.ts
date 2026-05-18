import { test, expect } from '@playwright/test';

// Public list / detail pages should be CDN-cacheable (Spec 019).
// Auth-gated pages should NOT be CDN-cacheable. /api/auth/* must never
// leak Set-Cookie at the wrong cache layer. These tests assert the
// boundary.

test.describe('Caching headers', () => {
	test('home cache-control allows revalidation', async ({ request }) => {
		const resp = await request.get('/');
		const cc = resp.headers()['cache-control'] ?? '';
		// Either truly static (s-maxage / immutable) or dynamic-but-revalidatable.
		// What we DON'T want is "no-store" — that'd defeat the CDN.
		expect(cc.toLowerCase()).not.toContain('no-store');
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
