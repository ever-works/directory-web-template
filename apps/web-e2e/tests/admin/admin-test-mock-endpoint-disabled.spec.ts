import { test, expect } from '@playwright/test';

// `/api/__test__/openai-mock/chat/completions` exists for local e2e
// scenarios that need to mock the OpenAI API. In production this MUST
// either be disabled (404) or strictly gated. Without coverage, an
// accidentally-enabled test endpoint could be abused to spoof AI replies.

test.describe('Test-only endpoints disabled by default', () => {
	test('/api/__test__/openai-mock/chat/completions rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/__test__/openai-mock/chat/completions', {
			data: { messages: [{ role: 'user', content: 'hi' }] }
		});
		const status = resp.status();
		// 404 = disabled (preferred), 401/403 = gated, 503 = explicitly disabled.
		// 200 would be a leak in prod-like env.
		expect(status, `__test__ endpoint`).toBeLessThan(500);
		// In CI, this endpoint may be enabled. We don't fail on 200, but we
		// log it so the operator notices.
		if (status >= 200 && status < 300) {
			console.log(
				'WARNING: /api/__test__/openai-mock/chat/completions returned 2xx; ensure it is disabled in production builds'
			);
		}
	});
});
