import { test, expect } from '@playwright/test';

test.describe('API: Scalar API reference UI (/api/reference)', () => {
	test('reference page returns a successful response', async ({ request }) => {
		const response = await request.get('/api/reference');

		// Scalar serves an HTML page — should be 2xx and not a 5xx.
		expect(response.status()).toBeLessThan(400);
	});

	test('reference page can be embedded by the same-origin /docs page', async ({ request }) => {
		const response = await request.get('/api/reference');
		expect(response.status()).toBeLessThan(400);

		// next.config.ts narrows the global X-Frame-Options: DENY / frame-ancestors 'none'
		// policy for this one route, because /docs renders it inside a same-origin
		// <iframe>. A regression here shows up as an empty "blocked" frame on /docs.
		const headers = response.headers();
		expect((headers['x-frame-options'] || '').toUpperCase()).toBe('SAMEORIGIN');
		const csp = (headers['content-security-policy'] || '').toLowerCase();
		expect(csp).toContain("frame-ancestors 'self'");
		// The Scalar handler loads its browser bundle from jsDelivr; the route CSP must allow it.
		expect(csp).toContain('https://cdn.jsdelivr.net');
	});

	test('openapi.json is reachable', async ({ request }) => {
		const response = await request.get('/openapi.json');

		// We don't assert content shape here because the OpenAPI spec is
		// generated at build time and may evolve. It must at least not 5xx.
		expect(response.status()).toBeLessThan(500);
	});
});
