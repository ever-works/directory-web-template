import { test, expect } from '@playwright/test';

/**
 * API smoke coverage for `POST /api/chat` (Spec 023).
 *
 * The default test environment ships with `aiChat.enabled: false`
 * (seed `awesome-time-tracking-data` does not enable it). The chat
 * route's contract under that state:
 *
 *   - Any POST → 404 with `{ "error": "not-found" }`.
 *   - The route must never 5xx, never leak schema details, and never
 *     execute a model call.
 *
 * Enabled-state assertions (401 when an authenticated-only scenario
 * is requested anonymously, 429 when over the rate limit, 200 with
 * a streamed body when fully wired) are tracked under
 * **T-013-followups** in `docs/spec/023-ai-chat/tasks.md` because
 * they require either a config-override hook or a mocked upstream
 * provider — neither exists today.
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

test.describe('API: /api/chat — disabled state (default)', () => {
	test('returns 404 when aiChat.enabled is not set in works.yml', async ({ request }) => {
		const response = await request.post('/api/chat', { data: MINIMAL_BODY });
		expect(response.status()).toBe(404);

		const json = await response.json().catch(() => null);
		if (json) {
			expect(json).toMatchObject({ error: 'not-found' });
		}
	});

	test('returns 400 on malformed JSON', async ({ request }) => {
		const response = await request.post('/api/chat', {
			data: '{not json',
			headers: { 'Content-Type': 'application/json' }
		});
		// Validation runs first, before the 404 gate, so this is 400.
		expect(response.status()).toBe(400);
	});

	test('returns 400 on missing messages field', async ({ request }) => {
		const response = await request.post('/api/chat', { data: {} });
		expect(response.status()).toBe(400);
	});

	test('does not 5xx — route is fail-soft even with garbage input', async ({ request }) => {
		const garbage = { messages: 'not-an-array', scenario: 999 };
		const response = await request.post('/api/chat', { data: garbage });
		expect(response.status()).toBeLessThan(500);
	});
});
