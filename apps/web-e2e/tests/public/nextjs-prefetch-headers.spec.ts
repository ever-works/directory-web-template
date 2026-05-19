import { test, expect } from '@playwright/test';

// Next.js prefetch sends `purpose: prefetch` and `next-router-prefetch: 1`
// headers. Server must tolerate them with non-5xx.

const PREFETCH_PATHS = [
	'/',
	'/about',
	'/discover/1',
	'/auth/signin',
	'/pricing',
	'/categories'
];

test.describe('Prefetch header tolerance', () => {
	for (const path of PREFETCH_PATHS) {
		test(`GET ${path} with purpose=prefetch non-5xx`, async ({ request }) => {
			const resp = await request.get(path, {
				headers: { purpose: 'prefetch', 'next-router-prefetch': '1' }
			});
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
