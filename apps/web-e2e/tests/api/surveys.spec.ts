import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the `/api/surveys/**` REST surface. The
 * existence-style endpoint (`/api/surveys/exists`) is intentionally
 * public and covered by `feature-existence.spec.ts`; everything in
 * this file targets the auth-gated routes that must surface a 4xx
 * without a session, never a 5xx.
 *
 * Per-survey GETs against a non-existent ID exercise the 404 path
 * for unauthenticated callers — the contract is "never crash" rather
 * than the specific status code.
 */
const FAKE_SURVEY_ID = '__no-such-survey__';
const FAKE_RESPONSE_ID = '__no-such-response__';

const SURVEYS_ENDPOINTS = [
	// Authenticated survey listing / creation.
	{ method: 'GET', path: '/api/surveys' },
	{ method: 'POST', path: '/api/surveys' },

	// Per-survey CRUD for a known-bad ID.
	{ method: 'GET', path: `/api/surveys/${FAKE_SURVEY_ID}` },
	{ method: 'PUT', path: `/api/surveys/${FAKE_SURVEY_ID}` },
	{ method: 'DELETE', path: `/api/surveys/${FAKE_SURVEY_ID}` },

	// Per-survey responses (list + submit).
	{ method: 'GET', path: `/api/surveys/${FAKE_SURVEY_ID}/responses` },
	{ method: 'POST', path: `/api/surveys/${FAKE_SURVEY_ID}/responses` },

	// Per-response detail.
	{ method: 'GET', path: `/api/surveys/responses/${FAKE_RESPONSE_ID}` },
] as const;

test.describe('API: Surveys auth-gated endpoints', () => {
	for (const { method, path } of SURVEYS_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const isWriteMethod = method !== 'GET';
			const response = await request.fetch(path, {
				method,
				...(isWriteMethod
					? {
						data: {},
						headers: { 'content-type': 'application/json' },
					}
					: {}),
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
