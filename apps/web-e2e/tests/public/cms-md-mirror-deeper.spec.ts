import { test, expect } from '@playwright/test';

// The site mirrors many routes as Markdown — /items/<slug>.md, /pages/<slug>.md
// etc. Existence depends on the route; we only assert non-5xx.

const MD_PROBES = [
	'/items/sample.md',
	'/items/does-not-exist.md',
	'/pages/about.md',
	'/pages/does-not-exist.md',
	'/categories/sample.md',
	'/tags/sample.md',
	'/collections/sample.md'
];

test.describe('Markdown mirror deeper', () => {
	for (const path of MD_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
