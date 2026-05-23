import { test, expect } from '@playwright/test';

// Do-Not-Track and Sec-GPC privacy headers must be tolerated.

test.describe('Privacy headers tolerance', () => {
	test('GET / with DNT=1 non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { dnt: '1' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Sec-GPC=1 non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'sec-gpc': '1' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Sec-Fetch-Site=cross-site non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'sec-fetch-site': 'cross-site' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Sec-Fetch-Mode=navigate non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'sec-fetch-mode': 'navigate' } });
		expect(resp.status()).toBeLessThan(500);
	});
});
