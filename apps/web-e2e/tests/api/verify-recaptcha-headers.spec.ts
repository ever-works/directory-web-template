import { test, expect } from '@playwright/test';

// /api/verify-recaptcha header tolerance and non-POST verbs.

test.describe('verify-recaptcha headers + verbs', () => {
	test('GET /api/verify-recaptcha returns 4xx not 5xx', async ({ request }) => {
		const resp = await request.get('/api/verify-recaptcha');
		expect(resp.status()).toBeLessThan(500);
	});

	test('DELETE /api/verify-recaptcha non-5xx', async ({ request }) => {
		const resp = await request.delete('/api/verify-recaptcha');
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/verify-recaptcha with multipart non-5xx', async ({ request }) => {
		const resp = await request.post('/api/verify-recaptcha', {
			multipart: { token: 'fake', action: 'submit' }
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
