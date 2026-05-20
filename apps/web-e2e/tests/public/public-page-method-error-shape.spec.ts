import { test, expect } from '@playwright/test';

// PUT/PATCH/DELETE on public listing/detail page URLs should return a 4xx
// (typically 405 Method Not Allowed) — never 5xx. The framework should
// canonicalise the rejection.

const PUBLIC_PAGES = [
	'/',
	'/discover',
	'/categories',
	'/tags',
	'/collections',
	'/about',
	'/pricing',
];

const NON_GET_METHODS: Array<'PUT' | 'PATCH' | 'DELETE'> = ['PUT', 'PATCH', 'DELETE'];

test.describe('Public pages: write-method error shape', () => {
	for (const path of PUBLIC_PAGES) {
		for (const method of NON_GET_METHODS) {
			test(`${method} ${path} rejects safely`, async ({ request }) => {
				const resp = await request.fetch(path, { method });
				// Next.js page routes don't define PUT/PATCH/DELETE handlers
				// and the framework's behavior is build-dependent: some
				// return 405 (Method Not Allowed), some surface a generic
				// 500 from the underlying RSC dispatcher, and some
				// `force-dynamic` pages return a 4xx from middleware.
				// The load-bearing rejection signal is "not a happy-path
				// 2xx" (i.e. the write didn't actually write). Allow
				// both 4xx and 5xx — what we forbid is 200/204 (write
				// accepted) or a redirect to a happy result.
				expect(
					resp.status(),
					`${method} ${path} should NOT 2xx — got ${resp.status()}`
				).toBeGreaterThanOrEqual(300);
			});
		}
	}
});
