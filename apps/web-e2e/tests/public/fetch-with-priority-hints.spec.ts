import { test, expect } from '@playwright/test';

// Server tolerates Priority and Save-Data hints. Save-Data: on is sent
// by mobile devices on metered connections — server may serve smaller
// payload but must not 5xx.

test.describe('Priority + Save-Data tolerance', () => {
	test('GET / with Save-Data: on non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'save-data': 'on' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Priority: u=0 non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { priority: 'u=0, i' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with DPR: 3 (device pixel ratio) non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { dpr: '3' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Sec-CH-UA-Mobile=?1 non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'sec-ch-ua-mobile': '?1' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with Sec-CH-UA-Platform="Windows" non-5xx', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { 'sec-ch-ua-platform': '"Windows"' }
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
