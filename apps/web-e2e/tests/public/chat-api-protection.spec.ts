import { test, expect } from '@playwright/test';

// /api/chat is AI chat. Anonymous probes must not exfiltrate tokens, must
// not 5xx, and must not allow unauthenticated abuse.

test.describe('/api/chat anonymous behavior', () => {
	test('GET /api/chat non-5xx', async ({ request }) => {
		const resp = await request.get('/api/chat');
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/chat with garbage non-5xx', async ({ request }) => {
		const resp = await request.post('/api/chat', {
			data: { messages: [{ role: 'user', content: 'hello' }] }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/chat with empty body non-5xx', async ({ request }) => {
		const resp = await request.post('/api/chat', {
			headers: { 'content-type': 'application/json' },
			data: ''
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/chat does not leak OPENAI_API_KEY', async ({ request }) => {
		const resp = await request.post('/api/chat', { data: { messages: [] } });
		expect(resp.status()).toBeLessThan(500);
		const txt = await resp.text();
		expect(txt).not.toMatch(/sk-[a-z0-9]{20,}/i);
	});
});
