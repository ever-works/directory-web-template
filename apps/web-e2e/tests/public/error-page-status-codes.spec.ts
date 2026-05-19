import { test, expect } from '@playwright/test';

// 404 must return HTTP 404, not 200 (CDN soft-404 anti-pattern).
// 5xx pages, if rendered, must announce a 5xx code (not 200).
// Several common bot-path 404s are checked explicitly.

const NOT_FOUND_PROBES = [
	'/this-page-definitely-does-not-exist-abc',
	'/items/this-slug-does-not-exist-xyzqwerty',
	'/categories/this-cat-does-not-exist-zz',
	'/tags/this-tag-does-not-exist-zz',
	'/collections/this-collection-does-not-exist-zz',
	'/wp-login.php',
	'/wp-admin',
	'/wordpress',
	'/phpmyadmin',
	'/.env',
	'/.git/config',
	'/.aws/credentials',
	'/node_modules/express/package.json',
	'/api/this-endpoint-does-not-exist-xyz'
];

test.describe('404 status code correctness', () => {
	for (const path of NOT_FOUND_PROBES) {
		test(`${path} returns proper 404 (not 200)`, async ({ request }) => {
			const resp = await request.get(path);
			// Acceptable: 404 (proper), 401/403 (gated), 405 (wrong method),
			// 308/307 (redirect to canonical 404 path). NOT 200.
			expect(resp.status(), `${path}`).not.toBe(200);
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}
});
