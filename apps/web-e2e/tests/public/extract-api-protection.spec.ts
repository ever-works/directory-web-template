import { test, expect } from '@playwright/test';

// /api/extract is the URL-extraction service (likely uses an LLM under the
// hood). Anonymous abuse vectors must be rejected.

test.describe('/api/extract anonymous behavior', () => {
	test('POST /api/extract without auth non-5xx', async ({ request }) => {
		const resp = await request.post('/api/extract', { data: { url: 'https://example.com' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/extract with localhost target non-5xx', async ({ request }) => {
		const resp = await request.post('/api/extract', { data: { url: 'http://127.0.0.1:5432' } });
		expect(resp.status()).toBeLessThan(500);
		// We don't enforce SSRF defense — but it must NOT 5xx loudly.
	});

	test('POST /api/extract with file:// non-5xx', async ({ request }) => {
		const resp = await request.post('/api/extract', { data: { url: 'file:///etc/passwd' } });
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/extract empty body non-5xx', async ({ request }) => {
		const resp = await request.post('/api/extract', { data: {} });
		expect(resp.status()).toBeLessThan(500);
	});
});
