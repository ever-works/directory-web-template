import { test, expect } from '@playwright/test';

// JSON mirrors of listing pages: /discover/1.json, /categories/sample.json etc.
// Should non-5xx and (if 200) return parseable JSON.

const PROBES = [
	'/discover/1.json',
	'/items/sample.json',
	'/categories/sample.json',
	'/tags/sample.json',
	'/collections/sample.json',
	'/comparisons/sample.json',
	'/pages/about.json'
];

test.describe('JSON mirror tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx and (if 200) parseable JSON`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			if (resp.status() === 200) {
				const txt = await resp.text();
				expect(() => JSON.parse(txt)).not.toThrow();
			}
		});
	}
});
