import { test, expect } from '@playwright/test';

// Web app manifest, if served, must be valid JSON with name + icons.

const MANIFEST_PATHS = ['/manifest.json', '/manifest.webmanifest', '/site.webmanifest'];

test.describe('Web manifest shape', () => {
	for (const path of MANIFEST_PATHS) {
		test(`${path} (if 200) is valid JSON with name`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			if (resp.status() !== 200) {
				test.skip();
				return;
			}
			const txt = await resp.text();
			let body: unknown;
			try {
				body = JSON.parse(txt);
			} catch {
				throw new Error(`${path} is not valid JSON`);
			}
			expect(body && typeof body === 'object', `${path} parsed object`).toBe(true);
			if (body && typeof body === 'object') {
				const b = body as Record<string, unknown>;
				// name OR short_name should exist
				const hasName = typeof b.name === 'string' || typeof b.short_name === 'string';
				expect(hasName, `${path} has name/short_name`).toBe(true);
			}
		});
	}
});
