import { test, expect } from '@playwright/test';
import { aiChatOverrideAvailable, apiOverrideHeaders } from '../../helpers/ai-chat';

/**
 * API contract assertions for `POST /api/chat` in the enabled state
 * (Spec 023, T-013g).
 *
 * Skips when override env vars are missing (see helpers/ai-chat.ts).
 */

const BODY_BROWSE = {
	messages: [
		{
			id: 'm1',
			role: 'user',
			parts: [{ type: 'text', text: 'hello' }]
		}
	]
};

function bodyForScenario(scenario: string) {
	return {
		...BODY_BROWSE,
		scenario
	};
}

test.beforeEach(({}) => {
	test.skip(
		!aiChatOverrideAvailable(),
		'Skipping enabled-state API contract specs: set E2E_ALLOW_TEST_OVERRIDES=true to run.'
	);
});

test.describe('API: /api/chat — enabled state contract (T-013g)', () => {
	test('returns 200 and streams a text/event-stream body for a valid request', async ({ request }) => {
		const response = await request.post('/api/chat', {
			data: BODY_BROWSE,
			headers: apiOverrideHeaders()
		});
		expect(response.status()).toBe(200);
		const ct = response.headers()['content-type'] ?? '';
		// The Vercel AI SDK's `toUIMessageStreamResponse` emits text/event-stream
		// (or a similar streaming Content-Type). Either is acceptable, but it
		// must be a streaming response, not application/json.
		expect(ct).not.toContain('application/json');
	});

	test('returns 401 when an auth-only scenario is requested anonymously', async ({ request }) => {
		const response = await request.post('/api/chat', {
			data: bodyForScenario('my-submissions'),
			headers: apiOverrideHeaders()
		});
		expect(response.status()).toBe(401);
	});

	test('returns 429 after the rate-limit window is exhausted', async ({ request }) => {
		// The anon rate-limit default is 20 / 60s. Fire a burst and assert
		// at least one request 429s. Use the same client IP (same request
		// fixture) so the bucket is shared.
		const burst = 25;
		const statuses: number[] = [];
		for (let i = 0; i < burst; i++) {
			const r = await request.post('/api/chat', {
				data: BODY_BROWSE,
				headers: apiOverrideHeaders()
			});
			statuses.push(r.status());
			if (r.status() === 429) break;
		}
		expect(
			statuses.some((s) => s === 429),
			`expected at least one 429, got ${statuses.join(',')}`
		).toBe(true);
	});
});
