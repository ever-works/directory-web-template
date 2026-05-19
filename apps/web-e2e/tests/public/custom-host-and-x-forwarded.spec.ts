import { test, expect } from '@playwright/test';

// Reverse-proxy header tolerance — X-Forwarded-Host, X-Forwarded-Proto,
// Host header tampering. Server must handle gracefully without 5xx and
// must not echo the spoofed host back into the response.

test.describe('Reverse-proxy header tolerance', () => {
	test('GET / with X-Forwarded-Host=evil non-5xx', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { 'x-forwarded-host': 'evil.example.com' }
		});
		expect(resp.status()).toBeLessThan(500);
		const body = await resp.text();
		expect(body).not.toMatch(/evil\.example\.com/);
	});

	test('GET / with X-Forwarded-Proto=ftp non-5xx', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { 'x-forwarded-proto': 'ftp' }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with custom X-Real-IP non-5xx', async ({ request }) => {
		const resp = await request.get('/', { headers: { 'x-real-ip': '127.0.0.1' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET / with conflicting X-Forwarded-For non-5xx', async ({ request }) => {
		const resp = await request.get('/', {
			headers: { 'x-forwarded-for': '127.0.0.1, evil.example.com, 0.0.0.0' }
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
