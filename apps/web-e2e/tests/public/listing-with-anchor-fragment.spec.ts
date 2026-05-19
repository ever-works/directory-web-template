import { test, expect } from '@playwright/test';

// URL fragments (#abc) should never affect server status. They're
// client-only — server should ignore them entirely.

const FRAG_PROBES = [
	'/#main',
	'/#footer',
	'/about#section-1',
	'/discover/1#results',
	'/items/sample#description',
	'/auth/signin#error',
	'/#' + 'a'.repeat(2048),
	'/#%00%01'
];

test.describe('Anchor fragment tolerance', () => {
	for (const path of FRAG_PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
