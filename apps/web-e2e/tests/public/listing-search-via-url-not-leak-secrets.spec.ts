import { test, expect } from '@playwright/test';

// Listing pages must NOT echo server env vars even when query mentions
// them. A common regression: error messages dump the env at startup.

const SENSITIVE = [
	'POSTGRES_PASSWORD',
	'AUTH_SECRET',
	'COOKIE_SECRET',
	'STRIPE_SECRET_KEY',
	'OPENAI_API_KEY',
	'DATABASE_URL',
	'GITHUB_TOKEN'
];

test.describe('Listing pages do not echo server env names', () => {
	test('GET / does not include secret env names', async ({ request }) => {
		const resp = await request.get('/');
		if (resp.status() >= 400) test.skip();
		const body = (await resp.text()).toLowerCase();
		for (const needle of SENSITIVE) {
			expect(body.includes(needle.toLowerCase() + '='), `/ contains ${needle}=`).toBe(false);
		}
	});

	test('GET /api/items.json does not echo secrets', async ({ request }) => {
		const resp = await request.get('/api/items.json');
		if (resp.status() >= 400) test.skip();
		const body = (await resp.text()).toLowerCase();
		for (const needle of SENSITIVE) {
			expect(body.includes(needle.toLowerCase() + '='), `items.json contains ${needle}=`).toBe(false);
		}
	});
});
