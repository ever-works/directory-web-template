import { test, expect } from '@playwright/test';

// Double-encoded paths and unusual percent sequences.

const PROBES = [
	'/items/%2525',
	'/items/foo%252Fbar',
	'/discover/1?q=%2525',
	'/discover/1?q=%E2%98%83', // ☃
	'/items/' + encodeURIComponent('🚀'),
	'/items/' + encodeURIComponent('а'.repeat(64)) // Cyrillic
];

test.describe('Double-percent / unicode encoded tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
