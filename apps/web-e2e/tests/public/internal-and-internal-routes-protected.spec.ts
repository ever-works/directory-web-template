import { test, expect } from '@playwright/test';

// /api/internal/* endpoints should NEVER be reachable anonymously. db-init
// is the worst-case data-destroyer; it must reject without leaking schema.

const INTERNAL_PROBES = [
	{ method: 'GET', path: '/api/internal/db-init' },
	{ method: 'POST', path: '/api/internal/db-init' },
	{ method: 'PUT', path: '/api/internal/db-init' },
	{ method: 'DELETE', path: '/api/internal/db-init' },
	{ method: 'GET', path: '/api/__test__/openai-mock/chat/completions' },
	{ method: 'POST', path: '/api/__test__/openai-mock/chat/completions' }
];

test.describe('Internal/test endpoints — anonymous rejection', () => {
	for (const { method, path } of INTERNAL_PROBES) {
		test(`${method} ${path} non-200 anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			// MUST never be 5xx and MUST never be 200 (would mean leaked
			// internal surface).
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status(), `${method} ${path}`).not.toBe(200);
		});
	}
});
