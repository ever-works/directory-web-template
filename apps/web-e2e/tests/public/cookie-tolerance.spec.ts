import { test, expect } from '@playwright/test';

// Cookie-handling tolerance: malformed, empty, oversize cookies must not
// crash any public route handler.

test.describe('Cookie tolerance', () => {
	test('GET / with empty Cookie header is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { cookie: '' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with malformed Cookie header is tolerated', async ({ request }) => {
		const resp = await request.get('/', { headers: { cookie: 'not-a-valid-cookie' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with huge cookie payload is tolerated', async ({ request }) => {
		const big = 'k=' + 'a'.repeat(4000);
		const resp = await request.get('/', { headers: { cookie: big } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with bogus session-token cookie is tolerated', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { cookie: '__Secure-authjs.session-token=garbage' }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/items.json with bogus session-token cookie is tolerated', async ({ request }) => {
		const resp = await request.get('/api/items.json', {
			headers: { cookie: '__Secure-authjs.session-token=garbage' }
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
