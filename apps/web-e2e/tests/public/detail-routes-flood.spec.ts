import { test, expect } from '@playwright/test';

// Sweep ALL public detail routes with both "sample" and "does-not-exist"
// slugs — quick regression check that detail rendering never 5xx.

const ROUTES = [
	'/items/SLUG',
	'/categories/SLUG',
	'/categories/category/SLUG',
	'/tags/SLUG',
	'/tags/tag/SLUG',
	'/collections/SLUG',
	'/comparisons/SLUG',
	'/surveys/SLUG',
	'/pages/SLUG'
];

const SLUGS = ['sample', 'does-not-exist-zzqxw'];

test.describe('Public detail route flood', () => {
	for (const route of ROUTES) {
		for (const slug of SLUGS) {
			const path = route.replace('SLUG', slug);
			test(`${path} non-5xx`, async ({ request }) => {
				const resp = await request.get(path);
				expect(resp.status(), path).toBeLessThan(500);
			});
		}
	}
});
