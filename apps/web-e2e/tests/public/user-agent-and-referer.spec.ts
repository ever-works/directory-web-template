import { test, expect } from '@playwright/test';

// Bot UAs, no-UA, and weird Referer values must all be tolerated.

test.describe('User-Agent tolerance', () => {
	test('GET / with empty UA is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'user-agent': '' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with bot UA is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with very long UA is tolerated', async ({ request }) => {
		const longUa = 'Mozilla/5.0 ' + 'x'.repeat(2000);
		const resp = await request.get('/', { headers: { 'user-agent': longUa } });
		expect(resp.status()).toBeLessThan(500);
	});
});

test.describe('Referer tolerance', () => {
	test('GET / with empty Referer is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { referer: '' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with javascript: Referer is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { referer: 'javascript:alert(1)' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with foreign Referer is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { referer: 'https://evil.example.com/' } });
		expect(resp.status()).toBeLessThan(500);
	});
});
