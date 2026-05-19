import { test, expect } from '@playwright/test';

// No React/Next.js error overlay text in production HTML. Common
// regression: a server-only API is imported into a client component and
// renders "Error: ..." inline.

const NO_ERROR_TEXT = [
	'__next_error__',
	'react-error-boundary',
	'Application error: a server-side exception',
	'Unhandled Runtime Error',
	'Error: Hydration failed',
	'TypeError:',
	'ReferenceError:'
];

const PROBES = ['/', '/about', '/discover/1'];

test.describe('No React error overlay in HTML', () => {
	for (const path of PROBES) {
		test(`${path} HTML body does not contain React error markers`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			if (resp.status() >= 400) test.skip();
			const body = await resp.text();
			for (const needle of NO_ERROR_TEXT) {
				expect(body.toLowerCase().includes(needle.toLowerCase()), `${path} contains "${needle}"`).toBe(
					false
				);
			}
		});
	}
});
