import { test, expect } from '@playwright/test';

// Surveys API gates: anonymous can GET public survey metadata but cannot
// create/modify; only authenticated users may submit responses.

test.describe('Surveys API — anonymous access pattern', () => {
	test('GET /api/surveys responds (anonymous list may be allowed)', async ({ request }) => {
		const resp = await request.get('/api/surveys');
		expect(resp.status(), `surveys list`).toBeLessThan(500);
	});

	// T-2529: an anonymous list only ever holds published surveys, whatever
	// `status` the query asks for (drafts and closed surveys are admin-only).
	for (const query of ['', '?status=draft', '?status=closed', '?status=bogus&type=bogus']) {
		test(`GET /api/surveys${query} lists only published surveys to anonymous callers`, async ({ request }) => {
			const resp = await request.get(`/api/surveys${query}`);
			expect(resp.status(), `surveys list ${query}`).toBeLessThan(500);
			if (resp.status() !== 200) return; // database or surveys unavailable in this environment
			const body = await resp.json();
			const surveys: Array<{ status?: string }> = body?.data?.surveys ?? [];
			for (const survey of surveys) {
				expect(survey.status, `anonymous list ${query}`).toBe('published');
			}
		});
	}

	test('GET /api/surveys/exists?slug=fake does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/surveys/exists?slug=fake-slug-zzz');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/surveys/[id] with bogus id does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/surveys/not-a-real-survey-zzz');
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/surveys (create) rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/surveys', {
			data: { title: 'Anonymous probe', questions: [] }
		});
		const status = resp.status();
		expect(status, 'create survey anon').toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('POST /api/surveys/[id]/responses (submit response) rejects anonymous', async ({
		request
	}) => {
		const resp = await request.post('/api/surveys/probe/responses', { data: { answers: [] } });
		const status = resp.status();
		expect(status, 'submit response anon').toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('DELETE /api/surveys/responses/[id] rejects anonymous', async ({ request }) => {
		const resp = await request.delete('/api/surveys/responses/probe');
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});
});
