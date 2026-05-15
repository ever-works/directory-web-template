import { test, expect } from '@playwright/test';

/**
 * API smoke coverage for `POST /api/chat` (Spec 023).
 *
 * `aiChat.enabled` defaults to `true`, but the default e2e environment
 * does not set `AI_CHAT_API_KEY`, so the route returns 503
 * (`provider-not-configured`). The handler still validates the request
 * body first, so we additionally assert 400 on malformed JSON / missing
 * fields and never a 5xx beyond the documented 503.
 *
 * Full enabled-state assertions (200 streamed body, 401 for auth-only
 * scenarios, 429 when rate-limited) live in
 * `ai-chat-enabled.spec.ts` and skip when the override env vars are
 * not provisioned.
 */

const MINIMAL_BODY = {
	messages: [
		{
			id: 'm1',
			role: 'user',
			parts: [{ type: 'text', text: 'hello' }]
		}
	]
};

test.describe('API: /api/chat — no API key (default e2e env)', () => {
	test('returns 503 when AI_CHAT_API_KEY is missing', async ({ request }) => {
		const response = await request.post('/api/chat', { data: MINIMAL_BODY });
		expect(response.status()).toBe(503);

		const json = await response.json().catch(() => null);
		if (json) {
			expect(json).toMatchObject({ error: 'provider-not-configured' });
		}
	});

	test('returns 400 on malformed JSON', async ({ request }) => {
		const response = await request.post('/api/chat', {
			data: '{not json',
			headers: { 'Content-Type': 'application/json' }
		});
		// Validation runs before the 503 gate.
		expect(response.status()).toBe(400);
	});

	test('returns 400 on missing messages field', async ({ request }) => {
		const response = await request.post('/api/chat', { data: {} });
		expect(response.status()).toBe(400);
	});

	test('does not 5xx beyond documented 503 — route is fail-soft for garbage input', async ({ request }) => {
		const garbage = { messages: 'not-an-array', scenario: 999 };
		const response = await request.post('/api/chat', { data: garbage });
		// 400 path takes precedence over 503 because validation runs first.
		expect(response.status()).toBe(400);
	});
});
