import { test, expect } from '@playwright/test';

// Static pages may declare stale-while-revalidate. We don't enforce — we
// verify if Cache-Control contains s-maxage / swr it's parseable.

const PROBES = ['/', '/about', '/api/items.json', '/api/featured-items'];

test.describe('Stale-while-revalidate shape (advisory)', () => {
	for (const path of PROBES) {
		test(`${path} cache-control directives are well-formed`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const cc = resp.headers()['cache-control'] || '';
			if (!cc) test.skip();
			// Each directive should be `key` or `key=value`.
			const directives = cc.split(',').map((d) => d.trim()).filter(Boolean);
			for (const d of directives) {
				// Disallow malformed like "max-age=" or "=10".
				expect(d, `${path} directive: ${d}`).toMatch(/^[a-z-]+(=\d+|="\w+")?$/i);
			}
		});
	}
});
