import { test, expect } from '@playwright/test';

// /api/chat is AI chat. Anonymous probes must not exfiltrate tokens
// and must not allow unauthenticated abuse. The route documents 503
// (provider-not-configured) when AI_CHAT_API_KEY is missing, which is
// the default CI environment — accept that explicitly alongside the
// general "no other 5xx" contract.

function isAcceptableNonError(status: number): boolean {
	// Anything below 500 is the normal case (gate / validation / 4xx).
	// 503 is the documented "provider not configured" envelope.
	return status < 500 || status === 503;
}

test.describe('/api/chat anonymous behavior', () => {
	test('GET /api/chat does not leak a 5xx (other than documented 503)', async ({ request }) => {
		const resp = await request.get('/api/chat');
		expect(isAcceptableNonError(resp.status())).toBeTruthy();
	});

	test('POST /api/chat with garbage does not leak a 5xx (other than documented 503)', async ({ request }) => {
		const resp = await request.post('/api/chat', {
			data: { messages: [{ role: 'user', content: 'hello' }] }
		});
		expect(isAcceptableNonError(resp.status())).toBeTruthy();
	});

	test('POST /api/chat with empty body does not leak a 5xx (other than documented 503)', async ({ request }) => {
		const resp = await request.post('/api/chat', {
			headers: { 'content-type': 'application/json' },
			data: ''
		});
		expect(isAcceptableNonError(resp.status())).toBeTruthy();
	});

	test('POST /api/chat does not leak OPENAI_API_KEY', async ({ request }) => {
		const resp = await request.post('/api/chat', { data: { messages: [] } });
		expect(isAcceptableNonError(resp.status())).toBeTruthy();
		const txt = await resp.text();
		expect(txt).not.toMatch(/sk-[a-z0-9]{20,}/i);
	});
});
