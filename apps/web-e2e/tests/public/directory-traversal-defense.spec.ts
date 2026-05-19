import { test, expect } from '@playwright/test';

// Defense against path-traversal / weird URL shapes hitting any of our
// dynamic slug routes.

const TRAVERSAL_PROBES = [
	'/items/..',
	'/items/../../etc/passwd',
	'/items/%2e%2e%2f',
	'/items/probe/../../../',
	'/categories/..%2f..%2f..%2fpassword',
	'/tags/%00null',
	'/auth/signin/../admin',
	'/api/items/../admin/items'
];

test.describe('Path traversal defense', () => {
	for (const path of TRAVERSAL_PROBES) {
		test(`${path} does not 5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('null byte in query does not 5xx', async ({ request }) => {
		const resp = await request.get('/discover/1?q=%00');
		expect(resp.status()).toBeLessThan(500);
	});

	test('extremely long slug does not 5xx', async ({ request }) => {
		const longSlug = 'a'.repeat(2048);
		const resp = await request.get(`/items/${longSlug}`);
		expect(resp.status()).toBeLessThan(500);
	});

	test('unicode-confusable characters in slug do not 5xx', async ({ request }) => {
		// Mixing Cyrillic 'а' with Latin chars (a homograph attack staple).
		const resp = await request.get('/items/' + encodeURIComponent('аdmin'));
		expect(resp.status()).toBeLessThan(500);
	});
});
