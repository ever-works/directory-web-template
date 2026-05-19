import { test, expect } from '@playwright/test';

// BOM and control characters in URLs.

const PROBES = [
	'/items/%EF%BB%BFsample',       // UTF-8 BOM prefix
	'/items/sample%00',             // null byte after slug
	'/items/sample%7F',             // DEL char
	'/items/sample%01%02%03',       // control chars
	'/discover/1?q=%EF%BB%BFhello'  // BOM in query
];

test.describe('BOM and control char URL tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
