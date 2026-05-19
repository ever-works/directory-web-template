import { test, expect } from '@playwright/test';

// /api/reports POST and surveys mutating routes — anonymous must 4xx.

const REPORTS_SURVEYS_PROBES = [
	{ method: 'GET', path: '/api/reports' },
	{ method: 'POST', path: '/api/reports' },
	{ method: 'GET', path: '/api/surveys' },
	{ method: 'POST', path: '/api/surveys' },
	{ method: 'GET', path: '/api/surveys/probe-id' },
	{ method: 'PUT', path: '/api/surveys/probe-id' },
	{ method: 'DELETE', path: '/api/surveys/probe-id' },
	{ method: 'POST', path: '/api/surveys/probe-id/responses' },
	{ method: 'GET', path: '/api/surveys/probe-id/responses' },
	{ method: 'GET', path: '/api/surveys/responses/probe-response-id' },
	{ method: 'DELETE', path: '/api/surveys/responses/probe-response-id' },
	{ method: 'GET', path: '/api/surveys/exists' }
];

test.describe('Reports and surveys deeper rejection', () => {
	for (const { method, path } of REPORTS_SURVEYS_PROBES) {
		test(`${method} ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			// Mutating must be 4xx anonymously. GETs may legitimately be 200.
			if (method !== 'GET') {
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			}
		});
	}
});
