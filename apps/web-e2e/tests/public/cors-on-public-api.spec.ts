import { test, expect } from '@playwright/test';

// Public read-only APIs may set Access-Control-Allow-Origin. If they do,
// it should NOT be a wildcard combined with credentials (the canonical
// cors footgun).

const PUBLIC_API = ['/api/items.json', '/api/tenant', '/api/version', '/api/featured-items'];

test.describe('CORS hygiene on public APIs', () => {
	for (const path of PUBLIC_API) {
		test(`${path} not wildcard-cors with credentials`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method: 'GET',
				headers: { origin: 'https://evil.example.com' }
			});
			expect(resp.status()).toBeLessThan(500);
			const acao = (resp.headers()['access-control-allow-origin'] || '').trim();
			const allowCred = (resp.headers()['access-control-allow-credentials'] || '').toLowerCase();
			if (acao === '*' && allowCred === 'true') {
				throw new Error(`${path}: wildcard CORS with credentials — security footgun`);
			}
		});

		test(`OPTIONS ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method: 'OPTIONS' });
			expect(resp.status(), `OPTIONS ${path}`).toBeLessThan(500);
		});
	}
});
