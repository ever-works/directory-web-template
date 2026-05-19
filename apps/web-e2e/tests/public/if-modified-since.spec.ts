import { test, expect } from '@playwright/test';

// Conditional request headers — server should respond 304 Not Modified
// or 200, never 5xx.

test.describe('Conditional request tolerance', () => {
	test('GET / with If-Modified-Since=epoch non-5xx', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { 'if-modified-since': 'Thu, 01 Jan 1970 00:00:00 GMT' }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with If-None-Match=fake non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'if-none-match': '"fake-etag"' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with If-None-Match=* non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'if-none-match': '*' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items.json with If-Modified-Since non-5xx', async ({ request }) => {
		const resp = await request.get('/api/items.json', {
			headers: { 'if-modified-since': 'Mon, 01 Jan 2024 00:00:00 GMT' }
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
