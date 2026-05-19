import { test, expect } from '@playwright/test';

// Public APIs must tolerate huge / weird query strings without 5xx.

test.describe('Large / unusual query strings', () => {
	test('items.json with 10kB query string is tolerated', async ({ request }) => {
		const huge = 'q=' + 'a'.repeat(10_000);
		const resp = await request.get('/api/items.json?' + huge);
		expect(resp.status()).toBeLessThan(500);
	});

	test('items.json with hundreds of params is tolerated', async ({ request }) => {
		const params: string[] = [];
		for (let i = 0; i < 200; i++) params.push(`k${i}=v${i}`);
		const resp = await request.get('/api/items.json?' + params.join('&'));
		expect(resp.status()).toBeLessThan(500);
	});

	test('items.json with repeated keys is tolerated', async ({ request }) => {
		const params: string[] = [];
		for (let i = 0; i < 50; i++) params.push(`category=cat${i}`);
		const resp = await request.get('/api/items.json?' + params.join('&'));
		expect(resp.status()).toBeLessThan(500);
	});

	test('items.json with unicode in query is tolerated', async ({ request }) => {
		const resp = await request.get('/api/items.json?q=' + encodeURIComponent('日本語 한국어 русский'));
		expect(resp.status()).toBeLessThan(500);
	});

	test('items.json with control characters in query is tolerated', async ({ request }) => {
		const resp = await request.get('/api/items.json?q=' + encodeURIComponent('a\x00b\x01c'));
		expect(resp.status()).toBeLessThan(500);
	});
});
