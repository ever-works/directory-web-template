import { test, expect } from '@playwright/test';

// Stress dynamic segment matchers with unusual chars.

const SEGMENT_PROBES = [
	'/items/with%20spaces',
	'/items/with+plus',
	'/items/with%2Fslash',
	'/items/with%23hash',
	'/items/with%3Fquestion',
	'/items/with%26amp',
	'/items/with(parens)',
	'/items/with[brackets]',
	'/items/with{braces}',
	'/items/with~tilde'
];

test.describe('Dynamic segment unusual char tolerance', () => {
	for (const path of SEGMENT_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
