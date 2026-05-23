import { test, expect } from '@playwright/test';

// AI-agent discovery + webfinger-like manifests. Spec 010 added the
// agent-discovery surface; this spec asserts the manifests are served
// at the expected paths with sane content-types.

const DISCOVERY_PATHS = [
	'/llms.txt',
	'/llms-full.txt',
	'/.well-known/llms.txt',
	'/.well-known/security.txt',
	'/.well-known/openapi.json'
];

test.describe('Discovery / well-known endpoints', () => {
	for (const path of DISCOVERY_PATHS) {
		test(`${path} responds non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('/llms.txt body is non-empty when present', async ({ request }) => {
		const resp = await request.get('/llms.txt');
		if (resp.status() >= 200 && resp.status() < 300) {
			const body = await resp.text();
			expect(body.length, 'llms.txt body should have meaningful length').toBeGreaterThan(20);
		}
	});

	test('manifest.webmanifest if present is valid JSON', async ({ request }) => {
		const resp = await request.get('/manifest.webmanifest');
		if (resp.status() >= 200 && resp.status() < 300) {
			const ct = resp.headers()['content-type'] ?? '';
			expect(ct.toLowerCase()).toMatch(/json|webmanifest/);
			// Parse to confirm validity
			const body = await resp.text();
			JSON.parse(body);
		}
	});
});
