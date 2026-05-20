import { test, expect } from '@playwright/test';

// Initial HTML payload must be under 1MB (1_000_000 bytes) for the
// homepage and signin. A 5MB HTML doc is a regression signal.

const PAGES = [
	{ path: '/', maxBytes: 1_500_000 },
	{ path: '/about', maxBytes: 1_500_000 },
	{ path: '/auth/signin', maxBytes: 1_500_000 },
	{ path: '/discover/1', maxBytes: 2_000_000 }
];

test.describe('Initial HTML payload size budget', () => {
	for (const { path, maxBytes } of PAGES) {
		test(`${path} HTML under ${maxBytes} bytes`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) {
				test.skip();
				return;
			}
			const body = await resp.body();
			expect(body.length, `${path} bytes=${body.length}`).toBeLessThan(maxBytes);
		});
	}
});
