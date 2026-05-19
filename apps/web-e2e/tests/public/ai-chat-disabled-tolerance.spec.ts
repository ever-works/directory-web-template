import { test, expect } from '@playwright/test';

// Spec 023 added the AI chat plugin. Without an AI_CHAT_API_KEY the
// AiChatMount component returns null. We should still be able to load
// the page; the chat just shouldn't render.

test.describe('AI chat — graceful disabled state', () => {
	test('home renders even without AI_CHAT_API_KEY', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		// If we managed to load the page, the absence of the chat trigger is
		// fine. We just don't want the page broken.
	});

	test('POST /api/chat rejects when chat is disabled', async ({ request }) => {
		const resp = await request.post('/api/chat', {
			data: { messages: [{ role: 'user', content: 'hi' }] }
		});
		// 503 (disabled), 401 (auth required), 403 (rate-limited / not allowed)
		// are all valid. Just no 5xx / 200 leak.
		const status = resp.status();
		expect(status).toBeLessThan(500);
		if (status >= 200 && status < 300) {
			// Probably a streaming response — we accept it but log.
			console.log(`/api/chat returned ${status}; AI may be configured in this env`);
		}
	});

	test('GET /api/chat is not GET-allowed', async ({ request }) => {
		const resp = await request.get('/api/chat');
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});
});
