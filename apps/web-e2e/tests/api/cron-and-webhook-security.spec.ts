import { test, expect } from '@playwright/test';

// Background job triggers (/api/cron/*) and external webhooks must reject
// unauthenticated calls cleanly — a forged cron hit could spam the entire
// user base with notifications, a forged platform webhook could mutate
// activity feed state.

const CRON_ENDPOINTS = ['/api/cron/sync', '/api/cron/subscription-reminders', '/api/cron/subscription-expiration'];

test.describe('Cron endpoint security', () => {
	for (const path of CRON_ENDPOINTS) {
		test(`${path} rejects unauthenticated call`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			// 401/403 (no CRON_SECRET) or 404 (cron disabled) are valid.
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} should not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});

		test(`${path} rejects wrong CRON_SECRET`, async ({ request }) => {
			const resp = await request.get(path, {
				headers: { Authorization: 'Bearer obviously-wrong-secret' }
			});
			const status = resp.status();
			expect(status).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});

test.describe('Platform webhook endpoint security', () => {
	test('GET /api/platform/activity-feed without HMAC rejects', async ({ request }) => {
		const resp = await request.get('/api/platform/activity-feed');
		const status = resp.status();
		// Either 401 (no signature) or 503 (not_provisioned, when secret absent).
		// 503 is acceptable here per Spec 024 ("blank → not_provisioned").
		expect(status, `activity-feed`).toBeGreaterThanOrEqual(400);
		expect([401, 403, 404, 503]).toContain(status);
	});

	test('GET /api/platform/activity-feed with bad HMAC rejects with 4xx or 503', async ({ request }) => {
		const resp = await request.get('/api/platform/activity-feed', {
			headers: { 'x-signature': 'garbage' }
		});
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		// 503 (not_provisioned) is the documented graceful-degradation
		// outcome when PLATFORM_SYNC_SECRET is unset (the CI case);
		// matches the sibling "without HMAC" test above.
		expect([400, 401, 403, 404, 503]).toContain(status);
	});

	test('POST /api/stripe/platform-webhook without HMAC fails closed', async ({ request }) => {
		const resp = await request.post('/api/stripe/platform-webhook', {
			data: {
				id: 'evt_fabricated',
				type: 'payment_intent.succeeded',
				data: { object: { metadata: { work_id: 'work-fabricated' } } }
			}
		});
		const status = resp.status();

		// 401 when provisioned; 503 is the documented fail-closed result when the
		// platform HMAC secret or Work id is absent in CI/self-hosted deployments.
		expect([401, 503]).toContain(status);
		const body = await resp.json();
		expect(body.received).toBeUndefined();
	});

	test('POST /api/stripe/platform-webhook rejects a fabricated HMAC', async ({ request }) => {
		const resp = await request.post('/api/stripe/platform-webhook', {
			headers: {
				authorization: 'Bearer fabricated',
				'x-platform-ts': new Date().toISOString()
			},
			data: {
				id: 'evt_fabricated',
				type: 'payment_intent.succeeded',
				data: { object: { metadata: { work_id: 'work-fabricated' } } }
			}
		});
		const status = resp.status();

		expect([401, 503]).toContain(status);
		const body = await resp.json();
		expect(body.received).toBeUndefined();
	});
});
