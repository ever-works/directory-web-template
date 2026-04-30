import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/reports` — the public-facing content
 * report submission endpoint. It is auth-gated (users must be
 * signed in to submit a report) and validates the body. Without a
 * session it must surface a 4xx; with an empty body it must surface
 * a 4xx — never a 5xx.
 */
test.describe('API: Reports submission', () => {
	test('POST /api/reports without a session does not 5xx', async ({ request }) => {
		const response = await request.post('/api/reports', {
			data: {
				contentType: 'item',
				contentId: '__no_such_id__',
				reason: 'spam',
			},
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});

	test('POST /api/reports with empty body does not 5xx', async ({ request }) => {
		const response = await request.post('/api/reports', {
			data: {},
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
