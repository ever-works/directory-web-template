import { test, expect } from '@playwright/test';

// Detail pages with RSC prefetch headers — main regression check for
// 5xx on real-world Next.js prefetch.

const DETAIL_PROBES = [
	'/items/sample',
	'/categories/sample',
	'/tags/sample',
	'/collections/sample',
	'/comparisons/sample',
	'/surveys/sample',
	'/pages/sample'
];

test.describe('Detail page RSC tolerance', () => {
	for (const path of DETAIL_PROBES) {
		test(`${path}?_rsc=abc non-5xx`, async ({ request }) => {
			const resp = await request.get(path + '?_rsc=abc');
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`${path} with RSC:1 header non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { headers: { RSC: '1' } });
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`${path} with Next-Url=/foo header non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { headers: { 'next-url': '/foo' } });
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
