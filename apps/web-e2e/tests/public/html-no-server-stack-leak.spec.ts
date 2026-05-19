import { test, expect } from '@playwright/test';

// Production HTML must not contain server-side stack-frame markers.
// Heroku/Vercel logs occasionally leak these in dev.

const STACK_MARKERS = [
	'at /var/task/',
	'at /home/runner/',
	'/api/__nextjs_original-stack-frame',
	'node_modules/next/dist/',
	'node_modules/@next/'
];

const PROBES = ['/', '/about', '/discover/1', '/items/sample'];

test.describe('No server stack-frame in HTML body', () => {
	for (const path of PROBES) {
		test(`${path} HTML has no stack-frame markers`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const body = await resp.text();
			for (const needle of STACK_MARKERS) {
				expect(body.includes(needle), `${path} contains stack: ${needle}`).toBe(false);
			}
		});
	}
});
