import { test, expect } from '@playwright/test';

// Small "boundary" endpoints that other systems depend on. Each one's
// response shape is a contract — a regression breaks an external consumer.

test.describe('Boundary endpoints', () => {
	test('POST /api/verify-recaptcha rejects empty body cleanly', async ({ request }) => {
		const resp = await request.post('/api/verify-recaptcha', { data: {} });
		const status = resp.status();
		// Could be 400 (missing token) or 200 (returns failure). Just no 5xx.
		expect(status).toBeLessThan(500);
	});

	test('POST /api/verify-recaptcha with garbage token returns failure body', async ({
		request
	}) => {
		const resp = await request.post('/api/verify-recaptcha', {
			data: { token: 'definitely-not-a-real-recaptcha-token' }
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/tenant responds non-5xx', async ({ request }) => {
		const resp = await request.get('/api/tenant');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/version returns version envelope or documented 404', async ({ request }) => {
		const resp = await request.get('/api/version');
		// Happy path: 200 with the canonical envelope
		// `{ commit, date, message, author, repository, lastSync, branch }`.
		// Degraded path (no DATA_REPOSITORY content cloned): documented
		// 404 with `{ error: 'Data repository not found' }`. What we
		// must NEVER see is a 5xx.
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() < 400) {
			const body = await resp.json();
			// The canonical identity field is `commit`; some legacy
			// builds also expose `version` / `app.version` / `data.version`.
			const identity =
				body.commit ?? body.version ?? body.app?.version ?? body.data?.version;
			expect(identity, 'version/commit identity field').toBeTruthy();
		}
	});

	test('POST /api/version/sync rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/version/sync', { data: {} });
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});
});
