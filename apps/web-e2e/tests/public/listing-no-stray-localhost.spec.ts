import { test, expect } from '@playwright/test';

// Production HTML must not contain stray "localhost", "127.0.0.1", or
// dev-only debug strings. Common in misconfigured PR-preview deploys.

const PROBES = ['/', '/about', '/discover/1', '/api/items.json', '/api/tenant'];

const BAD_NEEDLES = [
	'http://localhost:',
	'https://localhost:',
	'http://127.0.0.1',
	'__NEXT_PRIVATE_DEBUG',
	'WEBPACK_LOADER',
	'__webpack_require__'
];

test.describe('No stray dev / localhost strings', () => {
	for (const path of PROBES) {
		test(`${path} body does not include dev strings`, async ({ request, baseURL }) => {
			// Only enforce if running against non-localhost (CI / prod-like).
			if (baseURL && baseURL.includes('localhost')) {
				test.skip();
				return;
			}
			const resp = await request.get(path);
			if (resp.status() >= 400) {
				test.skip();
				return;
			}
			const body = (await resp.text()).toLowerCase();
			for (const needle of BAD_NEEDLES) {
				expect(body.includes(needle.toLowerCase()), `${path} contains "${needle}"`).toBe(false);
			}
		});
	}
});
