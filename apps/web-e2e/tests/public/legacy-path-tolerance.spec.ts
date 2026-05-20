import { test, expect } from '@playwright/test';

/**
 * Common legacy/static paths from older websites and crawlers. These
 * should never 5xx — the server should either redirect (3xx) or
 * return a clean 404. Returning a 200 with empty content would
 * be a bug (looks like a successful response with no information).
 */

const LEGACY_PATHS = [
	'/index.html',
	'/home.html',
	'/default.html',
	'/index.htm',
	'/home',
	'/main',
	'/index.php',
	'/index.asp',
	'/wp-admin/',
	'/wp-login.php',
	'/.git/HEAD',
	'/.env',
	'/.DS_Store',
];

test.describe('Legacy/static paths: tolerance (no 5xx)', () => {
	for (const path of LEGACY_PATHS) {
		test(`${path} returns sensible status (not 5xx)`, async ({ request }) => {
			const res = await request.get(path, { maxRedirects: 0 });
			expect(res.status(), path).toBeLessThan(500);
		});
	}
});

test.describe('Legacy/static paths: secrets exposure', () => {
	for (const path of ['/.env', '/.git/HEAD', '/.DS_Store', '/.git/config']) {
		test(`${path} does not return 200 OK (would expose secrets)`, async ({ request }) => {
			const res = await request.get(path, { maxRedirects: 0 });
			expect(res.status(), `${path} must not be 200`).not.toBe(200);
		});
	}
});
